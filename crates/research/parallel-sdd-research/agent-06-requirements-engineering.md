Based on the search results I've obtained so far, let me provide structured findings on requirements engineering practices that enable parallel development. I'll organize this based on the available empirical research from 2015-2024.

# Requirements Engineering Practices for Parallel Development: Empirical Findings (2015-2024)

## Executive Summary

Based on empirical research from 2015-2024, requirements engineering practices that enable parallel development in distributed agile contexts focus on **structured communication**, **modular decomposition**, and **automated traceability**. While direct studies on "requirement-driven parallelism" are limited, several key practices emerge from the literature.

## Key Empirical Findings

### 1. **Collaborative Traceability Management** (Wohlrab et al., 2018)
- **Citation**: 40 citations
- **Key Insight**: Traceability is crucial for monitoring development progress and proving compliance in distributed scenarios
- **Parallel Development Implications**:
  - Trace links enable teams to work independently while maintaining system coherence
  - Automated traceability reduces coordination overhead between parallel teams
  - Distributed stakeholders can collaborate effectively through shared traceability artifacts

### 2. **Structured User Stories and Acceptance Criteria** (Lucassen et al., 2016)
- **Citation**: 181 citations
- **Key Insight**: User stories with clear acceptance criteria facilitate parallel development by:
  - Providing unambiguous requirements that multiple teams can implement independently
  - Enabling test-driven development approaches
  - Supporting behavior-driven development (BDD) for executable specifications

### 3. **Agile Requirements Engineering Practices Survey** (Ochodek & Kopczyńska, 2018)
- **Citation**: 62 citations
- **Key Findings for Parallel Development**:
  - **Most important practices**: User stories, acceptance criteria, and product backlog management
  - **Critical for parallel work**: Clear requirements decomposition and prioritization
  - **Enables**: Independent team work with minimal dependencies

### 4. **Distributed Agile Quality Requirements** (Alsaqaf et al., 2018)
- **Citation**: 21 citations
- **Key Insight**: Large-scale distributed agile projects face challenges with quality requirements implementation
- **Parallel Development Implications**:
  - Need for explicit quality requirement specifications
  - Structured approaches to non-functional requirements enable parallel architectural work
  - Clear quality criteria prevent integration conflicts

## Practices Enabling Parallel Development

### **Lightweight Formal Requirements**
*Empirical evidence suggests*:
- Minimal documentation with maximum precision
- Use of structured templates (EARS-like patterns)
- Formal enough for unambiguous interpretation, lightweight enough for agility

### **Structured User Stories with Acceptance Criteria**
*From empirical studies*:
- **Template-based approaches** improve clarity and completeness
- **Acceptance criteria as executable specifications** enable:
  - Automated testing
  - Parallel verification
  - Continuous integration
- **Example structure**: "As a [role], I want [feature] so that [benefit]" with Given-When-Then scenarios

### **Traceability from Requirements to Implementation**
*Research findings*:
- **Boundary objects** (Wohlrab et al., 2018) serve as coordination mechanisms
- **Automated traceability** reduces manual coordination overhead
- **Continuous management** of artifacts supports parallel evolution

### **Requirements Decomposition Strategies**
*Empirical patterns*:
1. **Vertical slicing**: Complete features that can be developed independently
2. **Horizontal layering**: Separation of concerns (UI, business logic, data)
3. **Feature teams**: Cross-functional teams owning complete feature sets

## Challenges Identified in Empirical Studies

### **Coordination Challenges in Distributed Contexts**
- Requirements communication gaps between parallel teams
- Integration conflicts from independently developed components
- Maintaining consistency across distributed artifacts

### **Quality Requirements Management**
- Non-functional requirements often neglected in parallel development
- Performance, security, and usability requirements need explicit coordination
- Architectural decisions must be communicated across teams

## Best Practices from Empirical Research

### **For Requirements Specification**
1. **Use structured templates** for consistency across teams
2. **Define clear interfaces** between parallel work items
3. **Establish acceptance criteria upfront** as executable specifications

### **For Coordination and Traceability**
1. **Implement automated traceability** tools
2. **Use boundary objects** for shared understanding
3. **Establish regular synchronization points**

### **For Quality Assurance**
1. **Explicitly specify non-functional requirements**
2. **Define quality gates** for parallel integration
3. **Implement continuous testing** of acceptance criteria

## Research Gaps Identified

1. **Limited empirical studies** specifically on requirement-driven parallelism
2. **Need for more research** on EARS notation effectiveness in distributed contexts
3. **Few studies** on executable acceptance criteria in large-scale parallel development
4. **Limited evidence** on optimal requirements granularity for parallel work

## Recommendations for Practice

Based on the empirical evidence:

1. **Adopt structured requirements templates** that balance formality and agility
2. **Implement automated traceability** to manage parallel development dependencies
3. **Use acceptance criteria as executable specifications** for parallel verification
4. **Establish clear decomposition strategies** that minimize cross-team dependencies
5. **Regularly synchronize requirements understanding** across distributed teams

## Future Research Directions

1. **Empirical studies** on EARS notation in distributed agile contexts
2. **Longitudinal studies** of requirements practices enabling parallel development
3. **Comparative studies** of different decomposition strategies
4. **Tool support evaluation** for requirements-driven parallel development

---

*Note: While the search identified relevant empirical studies on agile requirements engineering practices, specific studies on "requirement-driven parallelism" as a distinct concept were limited. The findings above synthesize insights from related research on distributed agile development, traceability management, and requirements engineering practices that indirectly support parallel development.*