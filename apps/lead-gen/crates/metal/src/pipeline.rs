/// Pipeline state machine — tracks job applications through stages.
///
/// Each job moves through: Discovered → Qualified → Applied → Interview stages → Offer/Rejected.
/// Terminal states (Offer, Rejected, Withdrawn) generate training signals for the
/// embedding model: positive examples (phone screen+) improve future matching.

#[repr(u8)]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum PipelineStage {
    Discovered = 0,
    Qualified = 1,  // passed similarity threshold
    Applied = 2,
    PhoneScreen = 3,
    Technical = 4,
    Onsite = 5,
    Offer = 6,
    Rejected = 7,
    Withdrawn = 8,
}

impl PipelineStage {
    pub fn from_u8(v: u8) -> Self {
        match v {
            0 => Self::Discovered,
            1 => Self::Qualified,
            2 => Self::Applied,
            3 => Self::PhoneScreen,
            4 => Self::Technical,
            5 => Self::Onsite,
            6 => Self::Offer,
            7 => Self::Rejected,
            8 => Self::Withdrawn,
            _ => Self::Discovered,
        }
    }

    pub fn label(&self) -> &'static str {
        match self {
            Self::Discovered => "DISC",
            Self::Qualified => "QUAL",
            Self::Applied => "APPL",
            Self::PhoneScreen => "PHON",
            Self::Technical => "TECH",
            Self::Onsite => "ONST",
            Self::Offer => "OFFR",
            Self::Rejected => "REJT",
            Self::Withdrawn => "WITH",
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            Self::Discovered => "Discovered",
            Self::Qualified => "Qualified",
            Self::Applied => "Applied",
            Self::PhoneScreen => "Phone Screen",
            Self::Technical => "Technical",
            Self::Onsite => "Onsite",
            Self::Offer => "Offer",
            Self::Rejected => "Rejected",
            Self::Withdrawn => "Withdrawn",
        }
    }

    /// Is this a terminal state (no further transitions)?
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Offer | Self::Rejected | Self::Withdrawn)
    }

    /// Is this stage active (still in pipeline)?
    pub fn is_active(&self) -> bool {
        !self.is_terminal() && *self != Self::Discovered
    }

    /// Training signal for model retraining.
    /// `Some(1)` = positive example (reached interview+), `Some(0)` = negative.
    /// `None` = insufficient signal.
    pub fn training_label(&self) -> Option<u8> {
        match self {
            Self::PhoneScreen | Self::Technical | Self::Onsite | Self::Offer => Some(1),
            Self::Rejected => Some(0),
            _ => None,
        }
    }

    /// Valid next stages from the current stage.
    pub fn valid_transitions(&self) -> &'static [PipelineStage] {
        match self {
            Self::Discovered => &[Self::Qualified, Self::Rejected, Self::Withdrawn],
            Self::Qualified => &[Self::Applied, Self::Rejected, Self::Withdrawn],
            Self::Applied => &[Self::PhoneScreen, Self::Rejected, Self::Withdrawn],
            Self::PhoneScreen => &[Self::Technical, Self::Rejected, Self::Withdrawn],
            Self::Technical => &[Self::Onsite, Self::Offer, Self::Rejected, Self::Withdrawn],
            Self::Onsite => &[Self::Offer, Self::Rejected, Self::Withdrawn],
            Self::Offer | Self::Rejected | Self::Withdrawn => &[], // terminal
        }
    }

    /// Can transition to the target stage?
    pub fn can_transition_to(&self, target: PipelineStage) -> bool {
        self.valid_transitions().contains(&target)
    }
}

/// Aggregate pipeline statistics.
#[derive(Debug, Default)]
pub struct PipelineStats {
    pub discovered: u32,
    pub qualified: u32,
    pub applied: u32,
    pub interviewing: u32, // phone + technical + onsite
    pub offers: u32,
    pub rejected: u32,
    pub withdrawn: u32,
}

impl PipelineStats {
    pub fn record(&mut self, stage: PipelineStage) {
        match stage {
            PipelineStage::Discovered => self.discovered += 1,
            PipelineStage::Qualified => self.qualified += 1,
            PipelineStage::Applied => self.applied += 1,
            PipelineStage::PhoneScreen | PipelineStage::Technical | PipelineStage::Onsite => {
                self.interviewing += 1
            }
            PipelineStage::Offer => self.offers += 1,
            PipelineStage::Rejected => self.rejected += 1,
            PipelineStage::Withdrawn => self.withdrawn += 1,
        }
    }

    /// Conversion rate from discovered to qualified (0.0 - 1.0).
    pub fn qualification_rate(&self) -> f64 {
        if self.discovered == 0 {
            return 0.0;
        }
        self.qualified as f64 / self.discovered as f64
    }

    /// Conversion rate from applied to interview (0.0 - 1.0).
    pub fn interview_rate(&self) -> f64 {
        if self.applied == 0 {
            return 0.0;
        }
        self.interviewing as f64 / self.applied as f64
    }

    pub fn total_active(&self) -> u32 {
        self.qualified + self.applied + self.interviewing
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_roundtrip() {
        for i in 0..=8 {
            let stage = PipelineStage::from_u8(i);
            assert_eq!(stage as u8, i);
        }
    }

    #[test]
    fn test_unknown_maps_to_discovered() {
        assert_eq!(PipelineStage::from_u8(255), PipelineStage::Discovered);
    }

    #[test]
    fn test_terminal() {
        assert!(PipelineStage::Offer.is_terminal());
        assert!(PipelineStage::Rejected.is_terminal());
        assert!(PipelineStage::Withdrawn.is_terminal());
        assert!(!PipelineStage::Applied.is_terminal());
    }

    #[test]
    fn test_training_labels() {
        assert_eq!(PipelineStage::PhoneScreen.training_label(), Some(1));
        assert_eq!(PipelineStage::Offer.training_label(), Some(1));
        assert_eq!(PipelineStage::Rejected.training_label(), Some(0));
        assert_eq!(PipelineStage::Discovered.training_label(), None);
        assert_eq!(PipelineStage::Applied.training_label(), None);
    }

    #[test]
    fn test_transitions() {
        assert!(PipelineStage::Discovered.can_transition_to(PipelineStage::Qualified));
        assert!(!PipelineStage::Discovered.can_transition_to(PipelineStage::Offer));
        assert!(PipelineStage::Technical.can_transition_to(PipelineStage::Offer));
        assert!(PipelineStage::Offer.valid_transitions().is_empty());
    }

    #[test]
    fn test_stats() {
        let mut stats = PipelineStats::default();
        stats.record(PipelineStage::Discovered);
        stats.record(PipelineStage::Discovered);
        stats.record(PipelineStage::Qualified);
        stats.record(PipelineStage::Applied);
        stats.record(PipelineStage::PhoneScreen);

        assert_eq!(stats.discovered, 2);
        assert_eq!(stats.qualified, 1);
        assert_eq!(stats.applied, 1);
        assert_eq!(stats.interviewing, 1);
        assert_eq!(stats.qualification_rate(), 0.5);
        assert_eq!(stats.interview_rate(), 1.0);
    }
}
