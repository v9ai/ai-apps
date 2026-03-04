# Conway's Revenge: Why Your Beautiful Internal Platform is Gathering Dust

You spent a year building it. The architecture is pristine: a unified service mesh, GitOps everything, a perfectly abstracted multi-cloud layer. Your platform team is proud. And yet, the dashboard shows single-digit adoption. The very developers you built it for are still SSH-ing into old boxes and cobbling together shell scripts. What happened?

The data tells a brutal story. According to DX (Developer Experience) researchers, **developers rate their satisfaction with internal platforms 20% lower than with external tools.** Your brilliant platform is less liked than a random SaaS product. The 2024 State of Platform Engineering Report confirms the symptom: "Driving Adoption" is a top-3 challenge, noting that **“Adoption is the ultimate metric for platform success.”**

The tech isn’t wrong. The design is. We built platforms for the org chart we *wished* we had, not the one we *actually have*. This is Conway’s Law exacting its revenge.

## The Autopsy of a Platform Failure

The classic failure mode is top-down, architecturally-dictated design. A central team, often of senior architects, designs an Internal Developer Platform (IDP) based on an idealized, greenfield architecture. They envision a perfect microservice mesh, specific orchestration patterns, and a glorious event-driven future.

Then they deliver it to product teams. The reaction is a collective shrug, or worse, active hostility. The platform feels like a straitjacket. As one internal platform engineer at a fintech lamented on Hacker News: **“We built a Ferrari. They asked for a reliable bicycle with a basket.”**

The platform team is baffled. They built the "right" thing! But they committed the cardinal sin: they designed a system for an organization that doesn't exist. They ignored the live, breathing, messy reality of how their company actually builds software.

## Conway's Law is Not Your Enemy; It's Your Blueprint

In 1967, Melvin Conway made a simple, empirical observation: **“Any organization that designs a system will produce a design whose structure is a copy of the organization's communication structure.”** This isn't a suggestion; it's a force of nature.

If you have a frontend team and a backend team, you'll get a frontend and a backend. If you have three squads owning three user journeys, you'll get three service boundaries. Attempting to architect a platform that requires a radically different communication structure is like trying to build a bridge that violates the laws of physics. It will collapse under social weight.

Fighting Conway's Law is the root cause of platform rejection. You built a platform that assumes seamless, cross-functional collaboration on infrastructure. Your org chart shows siloed teams focused on product features. The mismatch is fatal.

## The Data-Driven Case for Mirroring, Not Mandating

The research is unequivocal: successful platforms embrace reality, not fight it.

1.  **Autonomy is Non-Negotiable.** The DORA State of DevOps research is clear: high-performing teams have high levels of autonomy and mastery. A platform that feels like a restrictive, top-down mandate directly attacks these drivers. It’s not a platform; it’s a permit office.
2.  **Golden Paths are Found, Not Laid.** Successful platforms, like those at Adidas and Fidelity, often start by **codifying the tools and processes already used by the most effective teams.** They observe, "Team A is deploying faster and with fewer outages. What are they doing?" Then they productize that. The "golden path" is discovered in the wild, not decreed from an ivory tower. Others follow because it solves a *real, felt* problem, not an architectural ideal.
3.  **The Shadow IT Multiplier.** A failed platform project has a hidden cost: increased fragmentation. Distrustful teams, unable to use the "official" platform, build their own shadow infrastructure. You started with three ways to deploy; you end up with ten. The platform meant to consolidate chaos instead magnifies it.

The lesson is to adopt a product mindset, as Manuel Pais co-author of *Team Topologies*, states: **“The platform should be a product for its users: the stream-aligned teams.”** Your success metrics should be internal NPS, user deployment frequency, and onboarding time—not the technical purity of your service mesh.

## Navigating the Counterarguments: Enable, Don't Dictate

"But we need standards!" "We must lead innovation!" "Scale demands control!" These are valid tensions, not reasons for top-down dictatorship.

The need for security, compliance, and cost control is real. The answer is not to dictate *how* a team operates, but to **make the compliant path the easiest one.** Provide a paved road that fits the cars they're already driving.

The platform's role is to **enable and codify**, not to **dictate and restrict**. This is the necessary tension. You provide the guardrails and the easy, self-service pavement for the patterns teams need. As Kelsey Hightower put it: **“The best tools are the ones people choose to use.”**

Your first question to a team shouldn't be, "Here is how you must deploy." It should be, **“What are you struggling with?”** Maybe it’s environment sprawl, or secret management, or that damn cron job. Start there.

## Building a Platform That Gets Used

Reframe the mission. The platform team is not building a new architectural utopia. It is building a **productivity multiplier for the existing organization.** Your goal is to make the current structure—with all its warts and Conway-mandated boundaries—dramatically more effective.

Before you write a single line of Terraform or Kubernetes YAML, do this: map your organization's communication paths. Draw the team boundaries. Talk to developers about their actual workflows and pain points.

That map isn't just an org chart. **It is your platform's first, and most important, architecture diagram.** Ignore it at your peril. Embrace it, and you might just build something people will use.