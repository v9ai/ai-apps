import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Section,
  Text,
} from "@react-email/components";
import React from "react";
import { LOGO_ALT, LOGO_BASE64, LOGO_HEIGHT, LOGO_WIDTH } from "./logo";

export interface SignatureConfig {
  name: string;
  phone: string;
  email: string;
  website: string;
  calendly: string;
  linkedin: string;
  github: string;
  /** Optional hosted logo URL — overrides the default base64-encoded SVG wordmark.
   *  Use for Outlook desktop compatibility (e.g. "https://vadim.blog/logo.png"). */
  logoUrl?: string;
}

export const vadimSignatureConfig: SignatureConfig = {
  name: "Vadim Nicolai",
  phone: "+40774005428",
  email: "contact@vadim.blog",
  website: "https://vadim.blog/",
  calendly: "https://calendly.com/v9ai",
  linkedin: "https://www.linkedin.com/in/vadimnicolai/",
  github: "https://github.com/v9ai",
};

const styles = {
  container: {
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    maxWidth: "480px",
    padding: "0",
    margin: "0",
  },
  logo: {
    display: "block" as const,
    marginBottom: "8px",
  },
  name: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#1a1a1a",
    margin: "0 0 2px 0",
    lineHeight: "1.3",
  },
  title: {
    fontSize: "13px",
    color: "#555555",
    margin: "0 0 10px 0",
    lineHeight: "1.4",
  },
  contactRow: {
    fontSize: "12px",
    color: "#444444",
    margin: "0 0 4px 0",
    lineHeight: "1.5",
  },
  link: {
    color: "#0066cc",
    textDecoration: "none",
    fontSize: "12px",
  },
  label: {
    color: "#888888",
    fontSize: "12px",
    marginRight: "4px",
  },
  linksRow: {
    fontSize: "12px",
    color: "#444444",
    margin: "8px 0 0 0",
    lineHeight: "1.5",
  },
  separator: {
    color: "#cccccc",
    margin: "0 6px",
    fontSize: "12px",
  },
};

export function EmailSignature(config: SignatureConfig): React.ReactElement {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#ffffff", margin: "0", padding: "0" }}>
        <Container style={styles.container}>
          <Section>
            <Img
              src={config.logoUrl ?? LOGO_BASE64}
              alt={LOGO_ALT}
              width={LOGO_WIDTH}
              height={LOGO_HEIGHT}
              style={styles.logo}
            />
            <Text style={styles.name}>{config.name}</Text>
            <Text style={styles.title}>Software Engineer</Text>
            <Text style={styles.contactRow}>
              <span style={styles.label}>Email:</span>
              <Link href={`mailto:${config.email}`} style={styles.link}>
                {config.email}
              </Link>
            </Text>
            <Text style={styles.contactRow}>
              <span style={styles.label}>Phone:</span>
              <Link href={`tel:${config.phone}`} style={styles.link}>
                {config.phone}
              </Link>
            </Text>
            <Text style={styles.contactRow}>
              <span style={styles.label}>Web:</span>
              <Link href={config.website} style={styles.link}>
                {config.website.replace(/\/$/, "")}
              </Link>
            </Text>
            <Text style={styles.linksRow}>
              <Link href={config.linkedin} style={styles.link}>
                LinkedIn
              </Link>
              <span style={styles.separator}>|</span>
              <Link href={config.github} style={styles.link}>
                GitHub
              </Link>
              <span style={styles.separator}>|</span>
              <Link href={config.calendly} style={styles.link}>
                Book a call
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function VadimSignature(): React.ReactElement {
  return <EmailSignature {...vadimSignatureConfig} />;
}

const minimalStyles = {
  container: {
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    maxWidth: "480px",
    padding: "0",
    margin: "0",
  },
  line: {
    fontSize: "12px",
    color: "#555555",
    margin: "0 0 3px 0",
    lineHeight: "1.5",
  },
  link: {
    color: "#0066cc",
    textDecoration: "none",
    fontSize: "12px",
  },
  separator: {
    color: "#cccccc",
    margin: "0 5px",
    fontSize: "12px",
  },
  nameBold: {
    fontWeight: "700",
    color: "#1a1a1a",
    fontSize: "13px",
  },
};

export function MinimalSignature(
  config: SignatureConfig
): React.ReactElement {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#ffffff", margin: "0", padding: "0" }}>
        <Container style={minimalStyles.container}>
          <Section>
            <Text style={minimalStyles.line}>
              <span style={minimalStyles.nameBold}>{config.name}</span>
            </Text>
            <Text style={minimalStyles.line}>
              <Link href={`mailto:${config.email}`} style={minimalStyles.link}>
                {config.email}
              </Link>
              <span style={minimalStyles.separator}>·</span>
              <Link href={config.website} style={minimalStyles.link}>
                {config.website.replace(/\/$/, "")}
              </Link>
              <span style={minimalStyles.separator}>·</span>
              <Link href={config.linkedin} style={minimalStyles.link}>
                LinkedIn
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
