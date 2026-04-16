/// Crypto/blockchain reference corpus for kNN classification.
///
/// Each entry is `(text, is_crypto)`. The embedding model maps these into
/// 384-dim space; at query time the top-7 nearest neighbours vote on whether
/// a company looks like a crypto/blockchain business.
///
/// Texts mimic the runtime format: "Name. Description. Industry. [services]"

pub struct CorpusEntry {
    pub text: &'static str,
    pub is_crypto: bool,
}

pub fn corpus() -> Vec<CorpusEntry> {
    vec![
        // -- Crypto / Blockchain (label = true) ----------------------------
        CorpusEntry {
            text: "Binance. The world's leading cryptocurrency exchange platform for Bitcoin, Ethereum and hundreds of altcoins. Cryptocurrency, Digital Assets. [crypto exchange, spot trading, futures, staking, launchpad]",
            is_crypto: true,
        },
        CorpusEntry {
            text: "Coinbase. Buy, sell, and manage cryptocurrency. We are building the cryptoeconomy — a more fair, accessible, efficient, and transparent financial system. Blockchain, Cryptocurrency. [crypto trading, custody, staking, wallet, institutional crypto]",
            is_crypto: true,
        },
        CorpusEntry {
            text: "Chainalysis. Blockchain analysis platform providing compliance and investigation tools for cryptocurrency businesses and government agencies. Blockchain, RegTech. [blockchain analytics, crypto compliance, transaction monitoring, KYT]",
            is_crypto: true,
        },
        CorpusEntry {
            text: "OpenSea. The world's first and largest NFT marketplace. Buy, sell, and discover exclusive digital items. NFT, Digital Art. [NFT marketplace, digital collectibles, NFT minting, auction]",
            is_crypto: true,
        },
        CorpusEntry {
            text: "Uniswap Labs. Building the Uniswap protocol, a decentralized exchange for swapping ERC-20 tokens on Ethereum. DeFi, Decentralized Finance. [decentralized exchange, DEX, liquidity pools, automated market maker, token swap]",
            is_crypto: true,
        },
        CorpusEntry {
            text: "Alchemy. The leading web3 development platform powering blockchain applications. Web3, Blockchain Infrastructure. [blockchain API, web3 development, NFT API, node infrastructure, blockchain data]",
            is_crypto: true,
        },
        CorpusEntry {
            text: "Ledger. Hardware wallet and security solutions for cryptocurrency and digital assets. Cryptocurrency, Hardware Security. [hardware wallet, cold storage, crypto security, digital asset management]",
            is_crypto: true,
        },
        CorpusEntry {
            text: "Aave. Open-source and non-custodial liquidity protocol for earning interest on deposits and borrowing assets. DeFi, Decentralized Finance. [lending protocol, flash loans, liquidity mining, DeFi governance]",
            is_crypto: true,
        },
        CorpusEntry {
            text: "Ripple. Enterprise blockchain and crypto solutions for cross-border payments and global money transfers. Blockchain, FinTech. [cross-border payments, XRP, digital asset settlement, blockchain payments, RippleNet]",
            is_crypto: true,
        },
        CorpusEntry {
            text: "ConsenSys. Building Ethereum-based infrastructure and applications including MetaMask and Infura. Blockchain, Ethereum. [MetaMask wallet, Infura nodes, Ethereum development, smart contracts, web3 tools]",
            is_crypto: true,
        },
        CorpusEntry {
            text: "MakerDAO. Decentralized autonomous organization governing the DAI stablecoin and the Maker protocol on Ethereum. DeFi, DAO. [stablecoin, decentralized governance, collateralized lending, DAI, crypto treasury]",
            is_crypto: true,
        },
        CorpusEntry {
            text: "Bitmain. Designs and manufactures ASIC chip hardware for Bitcoin mining. Crypto Mining, Hardware. [ASIC miners, Bitcoin mining, mining rigs, hash rate, proof of work]",
            is_crypto: true,
        },
        CorpusEntry {
            text: "Solana Labs. Building the fastest blockchain in the world for decentralized apps and marketplaces. Blockchain, Layer 1. [high-throughput blockchain, proof of history, Solana validator, dApp platform, token ecosystem]",
            is_crypto: true,
        },
        CorpusEntry {
            text: "Dapper Labs. Creator of NBA Top Shot and the Flow blockchain for digital collectibles and games. NFT, Blockchain Gaming. [NFT collectibles, Flow blockchain, blockchain gaming, digital assets, CryptoKitties]",
            is_crypto: true,
        },
        CorpusEntry {
            text: "Circle. Global financial technology firm and issuer of USDC stablecoin for digital dollar payments. Stablecoin, Crypto Payments. [USDC, stablecoin issuance, crypto payments, digital dollar, cross-border settlement]",
            is_crypto: true,
        },
        CorpusEntry {
            text: "Fireblocks. Enterprise platform for managing digital asset operations and building blockchain-based businesses. Digital Assets, Blockchain Infrastructure. [digital asset custody, MPC wallet, tokenization, DeFi access, crypto operations]",
            is_crypto: true,
        },

        // -- Non-crypto (label = false) ------------------------------------
        CorpusEntry {
            text: "Stripe. Online payment processing platform for internet businesses. FinTech, Payments. [payment gateway, subscription billing, invoicing, fraud detection, financial APIs]",
            is_crypto: false,
        },
        CorpusEntry {
            text: "Datadog. Cloud monitoring and analytics platform for infrastructure, applications, and logs. SaaS, DevOps. [APM, infrastructure monitoring, log management, cloud security, observability]",
            is_crypto: false,
        },
        CorpusEntry {
            text: "Figma. Collaborative interface design tool for teams building digital products. Design, SaaS. [UI design, prototyping, design systems, collaboration, vector graphics]",
            is_crypto: false,
        },
        CorpusEntry {
            text: "Snowflake. Cloud-based data warehousing platform for analytics and data sharing. Data Analytics, Cloud. [data warehouse, SQL analytics, data lake, data sharing, cloud storage]",
            is_crypto: false,
        },
        CorpusEntry {
            text: "HubSpot. CRM platform for inbound marketing, sales, and customer service automation. SaaS, Marketing. [CRM, marketing automation, email marketing, lead management, sales pipeline]",
            is_crypto: false,
        },
        CorpusEntry {
            text: "GitLab. Complete DevOps platform for software development, CI/CD, and security. DevTools, SaaS. [version control, CI/CD pipelines, code review, DevSecOps, source code management]",
            is_crypto: false,
        },
        CorpusEntry {
            text: "Plaid. Financial data connectivity platform linking bank accounts to fintech applications. FinTech, Banking. [bank linking, financial data API, account verification, transaction data, open banking]",
            is_crypto: false,
        },
        CorpusEntry {
            text: "Vercel. Cloud platform for frontend frameworks providing deployment, hosting and serverless functions. Cloud, Developer Tools. [frontend hosting, serverless functions, edge network, Next.js deployment]",
            is_crypto: false,
        },
        CorpusEntry {
            text: "Scale AI. Data labeling and AI infrastructure platform for training machine learning models. AI, Data. [data annotation, ML training data, computer vision labeling, NLP annotation, AI infrastructure]",
            is_crypto: false,
        },
        CorpusEntry {
            text: "Notion. All-in-one workspace for notes, tasks, wikis, and project management. Productivity, SaaS. [note-taking, project management, wikis, team collaboration, knowledge base]",
            is_crypto: false,
        },
        CorpusEntry {
            text: "Brex. Corporate card and spend management platform for startups and enterprises. FinTech, Corporate Finance. [corporate credit card, expense management, AP automation, corporate treasury, spend control]",
            is_crypto: false,
        },
        CorpusEntry {
            text: "Twilio. Cloud communications platform providing voice, SMS, video, and authentication APIs. Communications, Cloud. [SMS API, voice API, video API, two-factor authentication, programmable messaging]",
            is_crypto: false,
        },
        CorpusEntry {
            text: "Palantir Technologies. Data analytics and intelligence platform for government and commercial enterprises. Data Analytics, Enterprise. [big data analytics, intelligence platform, data integration, government technology]",
            is_crypto: false,
        },
        CorpusEntry {
            text: "UiPath. Enterprise robotic process automation platform for automating business workflows. RPA, Enterprise. [robotic process automation, workflow automation, AI-powered bots, business process management]",
            is_crypto: false,
        },
        CorpusEntry {
            text: "Elastic. Search, observability, and security platform built on Apache Lucene. DevTools, Search. [full-text search, Elasticsearch, APM, SIEM, log analytics]",
            is_crypto: false,
        },
        CorpusEntry {
            text: "Revolut. Digital banking app for personal and business finances across multiple currencies. FinTech, Neobank. [digital banking, multi-currency accounts, money transfers, budgeting, business accounts]",
            is_crypto: false,
        },
    ]
}
