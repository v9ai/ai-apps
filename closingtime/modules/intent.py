"""closingtime/modules/intent.py — Neural Hawkes Process for Intent

Research contribution: Models the prospect's buying journey as a *marked temporal point
process* where each signal (event) has a type (mark) and arrival time. The intensity
function of future events depends on the history of past events via a neural Hawkes
process. This directly models the self-exciting property of buying behavior.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import math

STAGES = ["unaware", "aware", "researching", "evaluating", "committed", "purchasing"]


class NeuralHawkesIntentPredictor(nn.Module):
    """
    Models the prospect's buying journey as a neural Hawkes process.

    The intensity function lambda(t) = f(history) captures:
    - Self-excitation: signal A makes signal B more likely (demo -> pricing visit)
    - Temporal decay: older signals have less influence
    - Cross-excitation: different signal types interact

    The integral of the intensity gives the expected number of future events,
    which we use to predict time-to-purchase.
    """

    def __init__(self, hidden=768, n_event_types=20, state_dim=64):
        super().__init__()
        self.n_event_types = n_event_types
        self.state_dim = state_dim

        # continuous-time LSTM for encoding event history
        self.event_embed = nn.Linear(hidden, state_dim)
        self.time_embed = nn.Linear(1, state_dim)

        # CTLSTM cell (Continuous-Time LSTM, Mei & Eisenbeis 2017)
        self.W_i = nn.Linear(state_dim * 2, state_dim)
        self.W_f = nn.Linear(state_dim * 2, state_dim)
        self.W_z = nn.Linear(state_dim * 2, state_dim)
        self.W_o = nn.Linear(state_dim * 2, state_dim)

        # decay parameter: controls how fast the hidden state decays between events
        self.decay = nn.Linear(state_dim * 2, state_dim)

        # target cell state (what the cell decays toward between events)
        self.W_c_bar = nn.Linear(state_dim * 2, state_dim)

        # intensity function: maps hidden state -> per-stage intensity
        self.intensity_head = nn.Sequential(
            nn.Linear(state_dim, 32),
            nn.GELU(),
            nn.Linear(32, len(STAGES)),
            nn.Softplus(),  # intensity must be positive
        )

        # direct stage classifier (for single-signal inputs)
        self.stage_head = nn.Sequential(
            nn.Linear(hidden, 384), nn.GELU(), nn.Dropout(0.1),
            nn.Linear(384, len(STAGES)),
        )

        # time-to-event predictor
        self.tte_head = nn.Sequential(
            nn.Linear(state_dim, 32), nn.GELU(),
            nn.Linear(32, 1), nn.Softplus(),
        )

    def ctlstm_cell(self, event_embed, time_delta, h_prev, c_prev, c_bar_prev):
        """
        Continuous-Time LSTM cell.
        Between events, the cell state decays exponentially toward c_bar.
        At each event, the cell is updated like a standard LSTM.
        """
        time_feat = self.time_embed(time_delta.unsqueeze(-1))
        x = torch.cat([event_embed, time_feat], dim=-1)

        # LSTM gates
        i = torch.sigmoid(self.W_i(x))
        f = torch.sigmoid(self.W_f(x))
        z = torch.tanh(self.W_z(x))
        o = torch.sigmoid(self.W_o(x))

        # decay rate
        delta = F.softplus(self.decay(x))

        # target cell state
        c_bar = self.W_c_bar(x)

        # cell update: standard LSTM + decay
        c = f * c_prev + i * z

        # between-event decay: c(t) = c_bar + (c - c_bar) * exp(-delta * dt)
        c_decayed = c_bar + (c - c_bar) * torch.exp(-delta * time_delta.unsqueeze(-1).clamp(min=0))

        h = o * torch.tanh(c_decayed)

        return h, c, c_bar, delta

    def forward(self, cls_embed, event_history=None):
        """
        cls_embed: (B, hidden) from shared encoder for the current signal
        event_history: list of {"embed": tensor, "days": float, "type": str}
                       or None for single-signal classification
        """
        # single signal: use direct classifier
        if event_history is None or len(event_history) == 0:
            logits = self.stage_head(cls_embed)
            probs = logits.softmax(-1)
            stage_idx = probs.argmax(-1).item()
            return {
                "stage": STAGES[stage_idx],
                "confidence": round(probs.max().item(), 3),
                "distribution": {s: round(probs[0, i].item(), 3) for i, s in enumerate(STAGES)},
                "trajectory": None,
                "data_points": 0,
            }

        # process event history through CT-LSTM
        h = torch.zeros(1, self.state_dim).to(cls_embed.device)
        c = torch.zeros(1, self.state_dim).to(cls_embed.device)
        c_bar = torch.zeros(1, self.state_dim).to(cls_embed.device)

        intensity_history = []

        for event in event_history:
            e_embed = self.event_embed(
                event["embed"].unsqueeze(0) if event["embed"].dim() == 1 else event["embed"]
            )
            dt = torch.tensor([event["days"]]).float().to(cls_embed.device)

            h, c, c_bar, delta = self.ctlstm_cell(e_embed, dt, h, c, c_bar)

            intensity = self.intensity_head(h)  # (1, n_stages)
            intensity_history.append(intensity)

        # add current signal
        current_embed = self.event_embed(cls_embed)
        dt_current = torch.tensor([0.0]).to(cls_embed.device)
        h, c, c_bar, delta = self.ctlstm_cell(current_embed, dt_current, h, c, c_bar)

        # current stage: from intensity + direct classifier (ensemble)
        current_intensity = self.intensity_head(h)
        direct_logits = self.stage_head(cls_embed)

        # blend: intensity informs transition dynamics, direct classifier handles semantics
        combined_logits = direct_logits + current_intensity.log()
        probs = combined_logits.softmax(-1)
        stage_idx = probs.argmax(-1).item()

        # time-to-event
        tte = self.tte_head(h).item()

        # trajectory from intensity trend
        if len(intensity_history) >= 2:
            recent_intensity = intensity_history[-1].sum().item()
            prev_intensity = intensity_history[-2].sum().item()
            velocity = recent_intensity - prev_intensity

            if len(intensity_history) >= 3:
                prev_prev = intensity_history[-3].sum().item()
                prev_velocity = prev_intensity - prev_prev
                acceleration = velocity - prev_velocity
            else:
                acceleration = 0

            direction = (
                "accelerating" if velocity > 0.05 and acceleration > 0
                else "cruising" if velocity > 0.05
                else "decelerating" if velocity < -0.05
                else "stalled" if abs(velocity) < 0.02 and len(event_history) > 5
                else "stable"
            )
        else:
            velocity, acceleration = 0, 0
            direction = "insufficient_data"

        return {
            "stage": STAGES[stage_idx],
            "confidence": round(probs.max().item(), 3),
            "distribution": {s: round(probs[0, i].item(), 3) for i, s in enumerate(STAGES)},
            "trajectory": {
                "days_to_purchase": max(1, round(tte * 30)),
                "direction": direction,
                "velocity": round(velocity, 3),
                "acceleration": round(acceleration, 3),
                "current_intensity": round(current_intensity.sum().item(), 3),
            },
            "data_points": len(event_history) + 1,
        }

    def compute_nll(self, intensity_history, event_times, T):
        """
        Negative log-likelihood of the Hawkes process.

        NLL = -sum log lambda(t_i) + integral_0^T lambda(t) dt

        First term: log intensity at event times (events should have high intensity)
        Second term: integral of intensity (penalizes overall high intensity)
        """
        log_intensity_sum = 0
        for intensity in intensity_history:
            log_intensity_sum += intensity.log().sum()

        # Monte Carlo approximation of the integral
        # integral_0^T lambda(t) dt ≈ T/n * sum(lambda(t_i)) for uniform t_i
        n_mc = 100
        mc_times = torch.rand(n_mc) * T
        # Sum over sampled intensity history as proxy (true MC would
        # require re-evaluating the CT-LSTM at each sampled time)
        if intensity_history:
            stacked = torch.stack(intensity_history)  # (n_events, 1, n_stages)
            mean_intensity = stacked.mean(dim=0).sum()  # average intensity
            integral_approx = mean_intensity * T
        else:
            integral_approx = torch.tensor(0.0)

        nll = -log_intensity_sum + integral_approx
        return nll
