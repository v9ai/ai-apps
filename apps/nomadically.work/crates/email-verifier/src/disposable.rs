use std::collections::HashSet;

static DISPOSABLE_DOMAINS: std::sync::OnceLock<HashSet<&'static str>> =
    std::sync::OnceLock::new();

static ROLE_PREFIXES: std::sync::OnceLock<HashSet<&'static str>> = std::sync::OnceLock::new();

fn disposable_domains() -> &'static HashSet<&'static str> {
    DISPOSABLE_DOMAINS.get_or_init(|| {
        [
            // Mailinator family
            "mailinator.com",
            "mailinator.net",
            "mailinator.org",
            // Guerrilla Mail family
            "guerrillamail.com",
            "guerrillamail.info",
            "guerrillamail.biz",
            "guerrillamail.de",
            "guerrillamail.net",
            "guerrillamail.org",
            "sharklasers.com",
            "guerrillamailblock.com",
            "spam4.me",
            // 10 Minute Mail
            "10minutemail.com",
            "10minutemail.net",
            "10minutemail.org",
            "10minemail.com",
            // Trash Mail
            "trashmail.com",
            "trashmail.at",
            "trashmail.io",
            "trashmail.me",
            "trashmail.net",
            "trashmail.org",
            "trashmail.xyz",
            "trashmail.live",
            // Yopmail family
            "yopmail.com",
            "yopmail.fr",
            "cool.fr.nf",
            "jetable.fr.nf",
            "nospam.ze.tc",
            "nomail.xl.cx",
            "mega.zik.dj",
            "speed.1s.fr",
            "courriel.fr.nf",
            "moncourrier.fr.nf",
            "monemail.fr.nf",
            "monmail.fr.nf",
            // Maildrop / Discard
            "maildrop.cc",
            "discard.email",
            "discardmail.com",
            "discardmail.de",
            // Fakeinbox / Spamgourmet
            "fakeinbox.com",
            "spamgourmet.com",
            "spamgourmet.net",
            "spamgourmet.org",
            // TempMail
            "tempmail.com",
            "tempmail.net",
            "tempmail.org",
            "temp-mail.org",
            "temp-mail.io",
            "tempr.email",
            "tempinbox.com",
            "tempinbox.co.uk",
            // Throwaway
            "throwaway.email",
            "throwam.com",
            "throwam.net",
            // Mailnesia
            "mailnesia.com",
            "mailnull.com",
            // Getairmail / Filzmail
            "getairmail.com",
            "filzmail.com",
            "trbvm.com",
            // Owlpic / Pookmail / Sofimail
            "owlpic.com",
            "pookmail.com",
            "sofimail.com",
            // Mailzilla
            "mailzilla.com",
            "mailzilla.org",
            // Spamgraphic / Lovemeleaveme
            "spamgraphic.com",
            "lovemeleaveme.com",
            "giantmail.de",
            "no-spam.ws",
            // Dispostable
            "dispostable.com",
            // Nada / Inboxkitten
            "nada.email",
            "inboxkitten.com",
            // Mailsac
            "mailsac.com",
            // Others
            "spamhereplease.com",
            "spamherelots.com",
            "mailtome.de",
            "mailme.lv",
            "spam.la",
            "amilegit.com",
            "amniesia.com",
            "boun.cr",
            "deadaddress.com",
            "despam.it",
            "dodgeit.com",
            "dodgit.com",
            "e4ward.com",
            "emkei.cz",
            "fakedemail.com",
            "fakeemail.de",
            "filzmail.com",
            "freemail.ms",
            "hmamail.com",
            "incognitomail.com",
            "instant-mail.de",
            "jetable.com",
            "jetable.net",
            "jetable.org",
            "kasmail.com",
            "klassmaster.com",
        ]
        .into()
    })
}

fn role_prefixes() -> &'static HashSet<&'static str> {
    ROLE_PREFIXES.get_or_init(|| {
        [
            "info",
            "admin",
            "support",
            "hello",
            "contact",
            "sales",
            "marketing",
            "webmaster",
            "postmaster",
            "noreply",
            "no-reply",
            "no_reply",
            "donotreply",
            "do-not-reply",
            "abuse",
            "security",
            "billing",
            "finance",
            "hr",
            "help",
            "team",
            "office",
            "press",
            "media",
            "legal",
            "accounts",
            "feedback",
            "careers",
            "jobs",
            "invest",
            "news",
            "newsletter",
            "unsubscribe",
            "privacy",
            "compliance",
            "tech",
            "service",
            "services",
            "dev",
            "test",
            "demo",
            "api",
            "bot",
            "mail",
            "hostmaster",
            "sysadmin",
            "ops",
            "root",
            "nobody",
            "www",
            "ftp",
            "proxy",
            "spam",
            "mailer",
            "mailer-daemon",
            "bounce",
            "bounces",
            "errors",
            "notifications",
            "alerts",
        ]
        .into()
    })
}

pub fn is_disposable(domain: &str) -> bool {
    disposable_domains().contains(domain.to_lowercase().as_str())
}

pub fn is_role_address(local: &str) -> bool {
    role_prefixes().contains(local.to_lowercase().as_str())
}
