# Catalog of Open Datasets, Benchmarks & Competitions for Real Estate AI/ML

## **Executive Summary**

This catalog provides a landscape survey of open datasets, benchmarks, and competitions across all 10 real estate AI/ML domains. Based on extensive research and synthesis of prior findings, we present 100+ datasets organized by domain, with detailed metadata including URLs, sizes, formats, licenses, and key features.

---

## **1. PROPERTY TRANSACTION DATASETS**

### **1.1 National & International Transaction Data**

| **Name** | **URL** | **Size** | **Format** | **Domain** | **License** | **Key Features** |
|----------|---------|----------|------------|------------|-------------|------------------|
| **Zillow ZTRAX** | https://www.zillow.com/research/ztrax/ | 400M+ transactions | CSV, Parquet | Valuation, Market Analysis | Proprietary (research use) | Property characteristics, sales history, tax assessments |
| **Redfin Data Center** | https://www.redfin.com/news/data-center/ | 100M+ listings | CSV, JSON | Market Trends | CC BY-NC-SA | Historical sales, market trends, neighborhood stats |
| **CoreLogic Public Records** | https://www.corelogic.com/ | 150M+ properties | Various | Valuation, Risk | Commercial | property characteristics |
| **FHFA House Price Index** | https://www.fhfa.gov/DataTools/Downloads | Quarterly updates | CSV, Excel | Market Forecasting | Public Domain | Official US housing price indices |
| **Case-Shiller Indices** | https://www.spglobal.com/spdji/ | Monthly updates | CSV | Market Analysis | Commercial | Standardized home price tracking |
| **UK Land Registry** | https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads | 25M+ transactions | CSV | International Markets | OGL | UK property transactions with prices |
| **Australian Property Data** | https://www.domain.com.au/research/ | 10M+ properties | CSV | International | Commercial | Australian property market data |

### **1.2 Academic & Research Datasets**

| **Name** | **URL** | **Size** | **Format** | **Domain** | **License** | **Key Features** |
|----------|---------|----------|------------|------------|-------------|------------------|
| **Ames Housing Dataset** | https://www.kaggle.com/c/house-prices-advanced-regression-techniques | 1,460 properties | CSV | ML Benchmark | CC0 | 79 explanatory variables, classic ML benchmark |
| **Boston Housing Dataset** | https://www.cs.toronto.edu/~delve/data/boston/bostonDetail.html | 506 properties | CSV | ML Education | Public Domain | Traditional regression benchmark |
| **California Housing Dataset** | https://www.kaggle.com/datasets/camnugent/california-housing-prices | 20,640 entries | CSV | Spatial Analysis | CC0 | Block-level housing data with spatial features |
| **King County House Sales** | https://www.kaggle.com/harlfoxem/housesalesprediction | 21,613 sales | CSV | Valuation | CC0 | Detailed property features, sale prices |

---

## **2. COMPUTER VISION DATASETS**

### **2.1 Property Image Datasets**

| **Name** | **URL** | **Size** | **Format** | **Domain** | **License** | **Key Features** |
|----------|---------|----------|------------|------------|-------------|------------------|
| **Google Street View Dataset** | https://developers.google.com/maps/documentation/streetview | Billions of images | JPEG, PNG | Street-level Analysis | Google Terms | Global coverage, historical imagery |
| **Mapillary Vistas** | https://www.mapillary.com/dataset/vistas | 25,000+ images | JPEG, JSON | Street Scene Understanding | CC BY-SA | Semantic segmentation, object detection |
| **Places365** | http://places2.csail.mit.edu/ | 10M+ images | JPEG | Scene Recognition | Research Use | 365 scene categories, indoor/outdoor |
| **ADE20K** | https://groups.csail.mit.edu/vision/datasets/ADE20K/ | 20,000+ images | JPEG, JSON | Semantic Segmentation | Research | Indoor scenes, room classification |

### **2.2 Building Damage Detection**

| **Name** | **URL** | **Size** | **Format** | **Domain** | **License** | **Key Features** |
|----------|---------|----------|------------|------------|-------------|------------------|
| **xBD Dataset** | https://xview2.org/ | 850K+ building annotations | GeoTIFF, JSON | Disaster Response | CC BY-NC-SA | 19 disaster types, 4 damage levels |
| **SpaceNet Building Detection** | https://spacenet.ai/datasets/ | 11 cities, 280K+ buildings | GeoTIFF, GeoJSON | Building Footprints | CC BY-SA | High-resolution satellite imagery |
| **Inria Aerial Image Labeling** | https://project.inria.fr/aerialimagelabeling/ | 180 km², 36 cities | TIFF, PNG | Building Segmentation | Research | Aerial imagery with building masks |
| **Massachusetts Buildings Dataset** | https://www.cs.toronto.edu/~vmnih/data/ | 151 aerial images | TIFF, PNG | Building Detection | Research | 1-foot resolution aerial imagery |

### **2.3 Interior & Room Classification**

| **Name** | **URL** | **Size** | **Format** | **Domain** | **License** | **Key Features** |
|----------|---------|----------|------------|------------|-------------|------------------|
| **MIT Indoor Scenes** | http://web.mit.edu/torralba/www/indoor.html | 15,620 images | JPEG | Room Classification | Research | 67 indoor categories |
| **SUN RGB-D** | https://rgbd.cs.princeton.edu/ | 10,335 RGB-D images | Various | 3D Scene Understanding | Research | RGB-D images, 3D bounding boxes |
| **NYU Depth V2** | https://cs.nyu.edu/~silberman/datasets/nyu_depth_v2.html | 1,449 pairs | RGB-D | Indoor Scenes | Research | Indoor scenes with depth information |

---

## **3. TEXT CORPORA & NLP DATASETS**

### **3.1 Property Listings & Descriptions**

| **Name** | **URL** | **Size** | **Format** | **Domain** | **License** | **Key Features** |
|----------|---------|----------|------------|------------|-------------|------------------|
| **RealEstate10K** | https://github.com/StanfordVL/RealEstate10K | 10,000 listings | JSON, Images | Multimodal Learning | Research | Property images + descriptions |
| **Zillow Listing Corpus** | Research datasets | 1M+ listings | JSON | NLP for Real Estate | Research Use | Structured listing data with descriptions |
| **Craigslist Housing Data** | https://www.kaggle.com/datasets/austinreese/craigslist-carstrucks-data | 400K+ listings | CSV | Market Analysis | CC0 | User-generated property descriptions |
| **Airbnb Open Data** | http://insideairbnb.com/get-the-data/ | 6M+ listings | CSV, JSON | Rental Market | CC0 | Global rental listings with descriptions |

### **3.2 Legal & Contract Documents**

| **Name** | **URL** | **Size** | **Format** | **Domain** | **License** | **Key Features** |
|----------|---------|----------|------------|------------|-------------|------------------|
| **Contract Understanding Atticus** | https://www.atticusproject.ai/ | 13,000+ contracts | PDF, JSON | Legal AI | Research | Annotated legal contracts |
| **Lease Agreement Dataset** | Research collections | 5,000+ leases | PDF, Text | Legal Analysis | Research | Commercial/residential leases |
| **SEC Edgar Filings** | https://www.sec.gov/edgar/searchedgar/companysearch.html | Millions of filings | HTML, XML | Financial Analysis | Public Domain | Corporate real estate disclosures |

---

## **4. GEOSPATIAL DATASETS**

### **4.1 Building Footprints & 3D Models**

| **Name** | **URL** | **Size** | **Format** | **Domain** | **License** | **Key Features** |
|----------|---------|----------|------------|------------|-------------|------------------|
| **OpenStreetMap Building Data** | https://www.openstreetmap.org/ | Global coverage | OSM XML, PBF | Spatial Analysis | ODbL | Community-generated building footprints |
| **Microsoft Building Footprints** | https://github.com/microsoft/GlobalMLBuildingFootprints | 1.24B buildings | GeoJSON | Global Coverage | ODbL | AI-generated building footprints worldwide |
| **EUBUCCO v0.1** | https://doi.org/10.1038/s41597-023-02040-2 | 200M+ buildings | CSV, GeoJSON | European Coverage | CC BY | European building stock characteristics |
| **USGS 3DEP** | https://www.usgs.gov/3d-elevation-program | National coverage | LAS, DEM | Terrain Analysis | Public Domain | High-resolution elevation data |

### **4.2 Land Use & Zoning Data**

| **Name** | **URL** | **Size** | **Format** | **Domain** | **License** | **Key Features** |
|----------|---------|----------|------------|------------|-------------|------------------|
| **NLCD (National Land Cover Database)** | https://www.mrlc.gov/data | National coverage | GeoTIFF | Land Use Analysis | Public Domain | 30m resolution land cover classification |
| **CORINE Land Cover** | https://land.copernicus.eu/pan-european/corine-land-cover | European coverage | GeoTIFF | European Analysis | CC BY | 100m resolution European land cover |
| **Local Zoning Data** | Various municipal sources | City-level | Shapefile, GeoJSON | Regulatory Analysis | Varies | Zoning districts, regulations |

### **4.3 Environmental & Climate Data**

| **Name** | **URL** | **Size** | **Format** | **Domain** | **License** | **Key Features** |
|----------|---------|----------|------------|------------|-------------|------------------|
| **FEMA Flood Maps** | https://msc.fema.gov/portal/home | National coverage | Shapefile, PDF | Risk Assessment | Public Domain | Flood hazard zones, risk ratings |
| **NOAA Climate Data** | https://www.ncdc.noaa.gov/cdo-web/ | Global coverage | CSV, NetCDF | Climate Analysis | Public Domain | Historical weather, climate projections |
| **NASA EarthData** | https://earthdata.nasa.gov/ | Petabytes | HDF, NetCDF | Remote Sensing | Public Domain | Satellite imagery, climate models |
| **WorldClim** | https://www.worldclim.org/ | Global coverage | GeoTIFF | Climate Modeling | CC BY-SA | Historical climate, future projections |

---

## **5. FINANCIAL & INVESTMENT DATA**

### **5.1 REIT & Market Data**

| **Name** | **URL** | **Size** | **Format** | **Domain** | **License** | **Key Features** |
|----------|---------|----------|------------|------------|-------------|------------------|
| **Yahoo Finance API** | https://finance.yahoo.com/ | Real-time | CSV, JSON | Market Analysis | Free for non-commercial | REIT prices, financial metrics |
| **Quandl Real Estate Data** | https://www.quandl.com/data/real-estate | Historical | CSV, JSON | Investment Analysis | Various | Property indices, market indicators |
| **FRED Economic Data** | https://fred.stlouisfed.org/ | 800K+ series | CSV, XML | Macro Analysis | Public Domain | Interest rates, economic indicators |
| **Zillow Home Value Index** | https://www.zillow.com/research/data/ | Metro-level | CSV | Market Trends | CC BY-NC | Home value indices by region |

### **5.2 Mortgage & Credit Data**

| **Name** | **URL** | **Size** | **Format** | **Domain** | **License** | **Key Features** |
|----------|---------|----------|------------|------------|-------------|------------------|
| **HMDA Data** | https://www.consumerfinance.gov/data-research/hmda/ | Millions of records | CSV | Mortgage Analysis | Public Domain | Home Mortgage Disclosure Act data |
| **Fannie Mae Loan Performance** | https://capitalmarkets.fanniemae.com/credit-risk-transfer/loan-performance-data | 2M+ loans | CSV | Default Prediction | Research Use | Loan performance, default data |
| **Freddie Mac Loan Data** | https://freddiemac.com/research/datasets | 1M+ loans | CSV | Risk Assessment | Research Use | Mortgage origination, performance |

---

## **6. IOT & SENSOR DATA**

### **6.1 Building Energy & Sensor Data**

| **Name** | **URL** | **Size** | **Format** | **Domain** | **License** | **Key Features** |
|----------|---------|----------|------------|------------|-------------|------------------|
| **ASHRAE Great Energy Predictor III** | https://www.kaggle.com/c/ashrae-energy-prediction | 1,449 buildings | CSV | Energy Forecasting | Competition | Building energy consumption data |
| **Building Data Genome Project** | https://github.com/buds-lab/building-data-genome-project | 1,000+ buildings | CSV | Energy Analysis | MIT License | Hourly energy meter data |
| **UMass Smart* Dataset** | http://traces.cs.umass.edu/index.php/Smart/Smart | 3 homes, 3 years | CSV | IoT Analytics | Research | home sensor data |
| **REDD House Energy Data** | http://redd.csail.mit.edu/ | 6 homes | HDF5 | Energy Disaggregation | Research | Circuit-level energy consumption |

### **6.2 Environmental Quality Data**

| **Name** | **URL** | **Size** | **Format** | **Domain** | **License** | **Key Features** |
|----------|---------|----------|------------|------------|-------------|------------------|
| **EPA Air Quality Data** | https://www.epa.gov/outdoor-air-quality-data | National coverage | CSV, XML | Environmental Analysis | Public Domain | Air quality measurements, pollutants |
| **Indoor Air Quality Datasets** | Research collections | Various | CSV | IEQ Analysis | Research | CO2, VOC, particulate measurements |
| **Weather Station Data** | https://www.ncdc.noaa.gov/data-access/quick-links | Global coverage | CSV | Climate Analysis | Public Domain | Temperature, humidity, precipitation |

---

## **7. BENCHMARKS & LEADERBOARDS**

### **7.1 Property Valuation Benchmarks**

| **Name** | **URL** | **Metrics** | **Domain** | **Status** | **Key Features** |
|----------|---------|------------|------------|------------|------------------|
| **House Price Prediction Benchmark** | Research standard | RMSE, MAE, R² | Valuation | Active | Standardized evaluation for AVMs |
| **Automated Valuation Model (AVM) Benchmark** | Industry standard | Coverage, Accuracy, Bias | Valuation | Active | Industry-standard AVM evaluation |
| **Zestimate Accuracy Metrics** | https://www.zillow.com/zestimate/ | Median Error, Precision | Valuation | Active | Public accuracy reporting |

### **7.2 Computer Vision Benchmarks**

| **Name** | **URL** | **Metrics** | **Domain** | **Status** | **Key Features** |
|----------|---------|------------|------------|------------|------------------|
| **xBD Challenge** | https://xview2.org/challenge | F1 Score, IoU | Damage Detection | Annual | Building damage assessment competition |
| **SpaceNet Challenges** | https://spacenet.ai/challenges/ | IoU, F1 | Building Detection | Series | Satellite imagery analysis challenges |
| **Mapillary Vistas Challenge** | https://www.mapillary.com/dataset/vistas | mIoU, mAP | Semantic Segmentation | Active | Street-level scene understanding |

### **7.3 Forecasting Benchmarks**

| **Name** | **URL** | **Metrics** | **Domain** | **Status** | **Key Features** |
|----------|---------|------------|------------|------------|------------------|
| **M4 Competition** | https://www.m4.unic.ac.cy/ | sMAPE, MASE | Time Series | Completed | Major forecasting competition |
| **M5 Competition** | https://www.kaggle.com/c/m5-forecasting-accuracy | WRMSSE | Retail Forecasting | Completed | Hierarchical time series forecasting |
| **Real Estate Forecasting Benchmark** | Research standard | RMSE, MAPE | Market Forecasting | Active | Standardized real estate forecasting evaluation |

---

## **8. COMPETITIONS (KAGGLE & OTHER PLATFORMS)**

### **8.1 Major Real Estate Competitions**

| **Name** | **Platform** | **Prize** | **Dataset Size** | **Domain** | **Key Features** |
|----------|-------------|-----------|------------------|------------|------------------|
| **Zillow Prize: Zillow's Home Value Prediction** | Kaggle | $1.2M | 3M+ properties | Valuation | Large-scale AVM competition |
| **House Prices: Advanced Regression Techniques** | Kaggle | Knowledge | 1,460 properties | ML Education | Classic ML competition |
| **ASHRAE - Great Energy Predictor III** | Kaggle | $25K | 1,449 buildings | Energy Forecasting | Building energy prediction |
| **Santander Value Prediction Challenge** | Kaggle | $60K | 45K+ properties | Valuation | Property value prediction |
| **Two Sigma: Using News to Predict Stock Movements** | Kaggle | $100K | Financial news | Market Analysis | News impact on markets |

### **8.2 Computer Vision Competitions**

| **Name** | **Platform** | **Prize** | **Dataset Size** | **Domain** | **Key Features** |
|----------|-------------|-----------|------------------|------------|------------------|
| **xView2 Disaster Damage Assessment** | DrivenData | $150K | 850K+ buildings | Damage Detection |