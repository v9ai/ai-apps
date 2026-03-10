# Landscape Survey: Text-to-Floor-Plan Generation (2020-2026)

## Executive Summary

This survey provides a overview of text-to-floor-plan generation methods, focusing on generative models, layout optimization, constraint-based generation, graph-based approaches, and interactive editing systems. The field has seen rapid advancement from early GAN-based approaches to modern diffusion models and multimodal foundation models.

## 1. Text-to-Floor-Plan Generation Methods

### 1.1 Early Approaches (2020-2022)

**GAN-based Methods:**
- **Conditional GANs (cGANs):** Early attempts at generating floor plans from textual descriptions
- **Pix2PixHD:** Used for generating floor plan layouts from semantic maps
- **StyleGAN2:** Applied to architectural layout generation with style control

**Key Limitations:**
- Limited text understanding capabilities
- Poor handling of complex constraints
- Difficulty with multi-room coordination

### 1.2 Transformer-Based Approaches (2022-2024)

**Vision-Language Models:**
- **CLIP-guided generation:** Using CLIP embeddings to align text and layout
- **T5/GPT integration:** Language models for understanding architectural requirements
- **Multimodal transformers:** Jointly processing text and spatial information

**Advancements:**
- Better text understanding for architectural requirements
- Improved handling of room relationships
- More coherent multi-room generation

### 1.3 Diffusion Model Era (2023-2026)

**Current State-of-the-Art:**
- **Stable Diffusion fine-tuning:** Specialized models for architectural layouts
- **ControlNet for floor plans:** Precise control over room shapes and arrangements
- **Architectural Diffusion Models:** Domain-specific diffusion models

**Key Capabilities:**
- High-quality, diverse floor plan generation
- Better constraint satisfaction
- Interactive refinement capabilities

## 2. Layout Optimization Techniques

### 2.1 Room Arrangement Optimization

**Mathematical Formulations:**
- **Packing problems:** Treating rooms as rectangles to be packed optimally
- **Graph-based optimization:** Using adjacency graphs to optimize room placement
- **Energy minimization:** Formulating layout as energy minimization problem

**Optimization Methods:**
- **Genetic algorithms:** For exploring large layout spaces
- **Simulated annealing:** For finding optimal arrangements
- **Differentiable optimization:** Gradient-based methods for continuous improvement

### 2.2 Flow and Circulation Optimization

**Key Metrics:**
- **Connectivity:** Ensuring proper room-to-room access
- **Circulation efficiency:** Minimizing travel distances
- **Privacy gradients:** Public to private space transitions

**Optimization Approaches:**
- **Pathfinding algorithms:** For circulation path optimization
- **Social interaction modeling:** For space relationship optimization
- **Accessibility compliance:** ADA and universal design considerations

### 2.3 Building Code Compliance

**Automated Compliance Checking:**
- **Rule-based systems:** Encoding building codes as constraints
- **ML-based compliance:** Learning code patterns from approved plans
- **Constraint satisfaction:** Ensuring all regulatory requirements are met

**Key Compliance Areas:**
- **Egress requirements:** Door sizes, exit paths
- **Room dimensions:** Minimum sizes for different room types
- **Window requirements:** Natural light and ventilation
- **Accessibility:** ADA compliance for all spaces

## 3. Constraint-Based Generation

### 3.1 Hard Constraints

**Fixed Requirements:**
- **Square footage:** Total area constraints
- **Room count:** Specific number and types of rooms
- **Dimensional constraints:** Minimum/maximum room sizes
- **Aspect ratios:** Room shape limitations

**Implementation Methods:**
- **Constraint programming:** Formal constraint satisfaction
- **Penalty methods:** Adding constraint violations to loss functions
- **Feasibility filtering:** Only generating feasible layouts

### 3.2 Soft Constraints and Preferences

**User Preferences:**
- **Room adjacencies:** Which rooms should be near each other
- **View orientations:** Window placement preferences
- **Privacy requirements:** Separation of public/private spaces
- **Style preferences:** Architectural style constraints

**Preference Modeling:**
- **Weighted constraints:** Different importance levels
- **Multi-objective optimization:** Balancing competing preferences
- **Interactive preference elicitation:** Learning from user feedback

### 3.3 Multi-Objective Optimization

**Conflicting Objectives:**
- **Cost vs. quality:** Budget constraints vs. design excellence
- **Privacy vs. openness:** Conflicting spatial requirements
- **Efficiency vs. aesthetics:** Functional vs. beautiful layouts

**Solution Approaches:**
- **Pareto optimization:** Finding trade-off solutions
- **Weighted sum methods:** Combining objectives
- **Interactive optimization:** User-guided exploration of trade-offs

## 4. Graph-Based Floor Plan Generation

### 4.1 Room Connectivity Graphs

**Graph Representations:**
- **Nodes as rooms:** Each room represented as a node
- **Edges as connections:** Doors and openings as edges
- **Weighted graphs:** Edge weights representing connection importance

**Generation Methods:**
- **Graph neural networks (GNNs):** Learning layout patterns from graph data
- **Graph-to-layout models:** Converting connectivity graphs to spatial layouts
- **Hierarchical graphs:** Multi-level representations for complex buildings

### 4.2 Spatial Relationship Graphs

**Beyond Connectivity:**
- **Proximity graphs:** Representing spatial relationships
- **Visibility graphs:** Line-of-sight relationships
- **Circulation graphs:** Movement patterns through spaces

**Applications:**
- **Social interaction optimization:** Based on relationship graphs
- **Wayfinding design:** Optimizing navigation through spaces
- **Privacy analysis:** From visibility relationships

### 4.3 Dual Graph Representations

**Mathematical Foundations:**
- **Primal-dual relationships:** Between rooms and connections
- **Voronoi diagrams:** For space partitioning
- **Delaunay triangulation:** For adjacency optimization

**Advantages:**
- **Geometric constraints:** Naturally encoded in dual representations
- **Topological properties:** Preserved through transformations
- **Optimization efficiency:** Better mathematical properties for optimization

## 5. Interactive Editing and Refinement

### 5.1 Real-Time Editing Systems

**Interactive Features:**
- **Drag-and-drop room editing:** Manual room repositioning
- **Automatic realignment:** Smart snapping and alignment
- **Constraint-aware editing:** Maintaining constraints during modifications
- **Undo/redo with AI suggestions:** Intelligent editing history

**Technical Implementation:**
- **Web-based interfaces:** For accessibility
- **Real-time constraint solving:** Immediate feedback
- **GPU acceleration:** For complex layouts

### 5.2 AI-Assisted Refinement

**Smart Suggestions:**
- **Layout improvement suggestions:** AI-generated alternatives
- **Constraint violation fixes:** Automatic correction of problems
- **Style adaptation:** Maintaining style while making changes
- **Optimization guidance:** Suggestions for better layouts

**Learning from Interaction:**
- **Preference learning:** Adapting to user style
- **Interactive optimization:** User-in-the-loop optimization
- **Collaborative design:** Human-AI co-creation

### 5.3 Version Control and Collaboration

**Collaborative Features:**
- **Multi-user editing:** Simultaneous collaboration
- **Version history:** Track design evolution
- **Comment and annotation:** Design discussion tools
- **Approval workflows:** For professional use

**Integration with Professional Tools:**
- **CAD software integration:** Export to industry standards
- **BIM compatibility:** Building Information Modeling support
- **Regulatory submission:** Automated compliance checking

## 6. Key Datasets and Benchmarks

### 6.1 Public Datasets

**Floor Plan Datasets:**
- **RPLAN dataset:** Large collection of residential floor plans
- **HouseExpo dataset:** Diverse residential layouts
- **Cubicasa5k:** 5,000+ annotated floor plans
- **Architectural plan datasets:** Professional architectural drawings

**Text-Plan Paired Datasets:**
- **Text2Plan:** Text descriptions paired with floor plans
- **Architectural requirements datasets:** Design briefs with resulting plans
- **Multi-modal datasets:** Images, text, and plans together

### 6.2 Evaluation Metrics

**Quantitative Metrics:**
- **Fréchet Inception Distance (FID):** For generation quality
- **Structural similarity:** Layout structure preservation
- **Constraint satisfaction rate:** Percentage of constraints met
- **User preference scores:** Human evaluation metrics

**Domain-Specific Metrics:**
- **Circulation efficiency:** Measured path lengths
- **Room adjacency satisfaction:** How well adjacencies are met
- **Code compliance rate:** Regulatory requirement satisfaction
- **Construction feasibility:** Practicality of generated layouts

## 7. Production Systems and Industry Applications

### 7.1 Commercial Platforms

**Leading Companies:**
- **Autodesk:** AI-powered layout tools in Revit
- **SketchUp:** AI-assisted space planning
- **ArchiStar AI:** Commercial floor plan generation
- **RoomSketcher:** AI-enhanced interior design

**Real Estate Applications:**
- **Virtual staging companies:** Using AI for furniture layout
- **Property development:** Automated preliminary designs
- **Real estate listings:** AI-generated floor plan alternatives

### 7.2 Integration with Real Estate Domains

**Property Valuation:**
- **Layout quality scoring:** Impact on property value
- **Space efficiency metrics:** Valuation adjustments
- **Market preference learning:** From successful listings

**Market Forecasting:**
- **Trend analysis:** Evolving layout preferences
- **Demographic adaptation:** Layouts for different demographics
- **Regional style learning:** Location-specific preferences

## 8. Research Gaps and Future Directions

### 8.1 Technical Challenges

**Current Limitations:**
- **Complex multi-story generation:** Limited work on multi-level buildings
- **Structural feasibility:** Integration with structural engineering
- **MEP integration:** Mechanical, electrical, plumbing considerations
- **Temporal dynamics:** Changing layouts over time

**Research Opportunities:**
- **Foundation models for architecture:** Large-scale pre-training
- **Causal layout design:** Understanding why layouts work
- **Multi-modal reasoning:** Combining text, images, and 3D
- **Real-world validation:** Testing in actual construction

### 8.2 Emerging Trends (2024-2026)

**Next-Generation Approaches:**
- **Agent-based design:** AI design agents with specialized roles
- **Generative simulation:** Layouts optimized through simulation
- **Neuro-symbolic AI:** Combining neural networks with symbolic reasoning
- **Quantum-inspired optimization:** For complex layout problems

**Industry Transformation:**
- **Automated design-to-construction:** End-to-end AI pipeline
- **Personalized architecture:** Mass customization of living spaces
- **Sustainable design generation:** AI-optimized for sustainability
- **Regulatory AI:** Automated code compliance and approval

## 9. Practical Implementation Guidelines

### 9.1 Starting Points for Development

**For Researchers:**
1. Begin with RPLAN or Cubicasa datasets
2. Implement baseline models (cGANs, diffusion models)
3. Focus on constraint satisfaction early
4. Develop evaluation metrics specific to architectural quality

**For Industry Practitioners:**
1. Start with rule-based systems for simple layouts
2. Integrate AI for complex constraint satisfaction
3. Focus on user-friendly interfaces
4. Ensure regulatory compliance from the beginning

### 9.2 Technology Stack Recommendations

**Core Technologies:**
- **PyTorch/TensorFlow:** For model development
- **Three.js/WebGL:** For interactive visualization
- **Constraint solvers:** For hard constraint satisfaction
- **Graph databases:** For relationship modeling

**Deployment Considerations:**
- **Cloud vs. edge:** Based on computation requirements
- **Real-time requirements:** For interactive applications
- **Data privacy:** For proprietary layout data
- **Integration APIs:** With existing architectural software

## 10. Cross-Domain Integration

### 10.1 Integration with Other Real Estate AI Domains

**Computer Vision Integration:**
- **Image-to-plan:** Generating plans from existing spaces
- **Plan quality assessment:** From visual features
- **Style transfer:** Applying styles from reference images

**NLP Integration:**
- **Requirements extraction:** From natural language briefs
- **Regulatory text understanding:** From building codes
- **Market analysis:** From listing descriptions and reviews

**Geospatial Integration:**
- **Site adaptation:** Layouts optimized for specific sites
- **Solar optimization:** Based on sun path analysis
- **View optimization:** Considering surrounding context

### 10.2 Business Applications Across Real Estate

**Property Development:**
- **Rapid prototyping:** Multiple design alternatives
- **Cost optimization:** Layouts optimized for construction cost
- **Market testing:** Virtual testing of layout preferences

**Real Estate Investment:**
- **Portfolio optimization:** Layout improvements for value add
- **Risk assessment:** Layout-related risk factors
- **Market trend analysis:** Evolving layout preferences

**Property Management:**
- **Space optimization:** For existing buildings
- **Renovation planning:** AI-assisted redesign
- **Maintenance planning:** From layout complexity

## Conclusion

Text-to-floor-plan generation represents a rapidly advancing field at the intersection of AI, architecture, and real estate. The progression from simple GAN-based approaches to sophisticated diffusion models with constraint satisfaction capabilities has created powerful tools for automated architectural design.

**Key Success Factors:**
1. **Constraint integration:** Successful systems seamlessly integrate hard and soft constraints
2. **User interaction:** The best tools combine AI generation with human creativity
3. **Domain knowledge:** Architectural expertise encoded in models
4. **Practical feasibility:** Consideration of real-world construction constraints

**Future Outlook:** The field is moving toward design systems that can handle complete building design, from initial concept through regulatory approval to construction documentation. The integration with other AI domains (computer vision, NLP, geospatial analytics) will create holistic property intelligence systems that transform how real estate is designed, valued, and managed.

**Immediate Research Priorities:**
1. Develop better evaluation metrics for architectural quality
2. Create larger, more diverse datasets with rich annotations
3. Improve constraint satisfaction for complex regulatory requirements
4. Enhance interactive editing capabilities for professional use

The convergence of generative AI with architectural design promises to democratize good design, optimize space utilization, and create more sustainable, livable environments while transforming the real estate industry across all 10 domains identified in your research scope.