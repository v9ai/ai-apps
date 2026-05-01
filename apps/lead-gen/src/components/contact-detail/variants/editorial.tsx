"use client";

import * as React from "react";
import { useMemo } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Badge,
  Box,
  Container,
  Em,
  Flex,
  Heading,
  Link as RadixLink,
  Separator,
  Strong,
  Text,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  EnvelopeClosedIcon,
  GitHubLogoIcon,
  GlobeIcon,
  LinkedInLogoIcon,
  StarIcon,
} from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { glassCard } from "@/recipes/cards";
import { useGetContactQuery } from "@/__generated__/hooks";
import {
  CollapsibleChips,
  ContactAvatar,
} from "@/components/contact-detail/shared/components";
import {
  cleanContactTags,
  coerceExternalUrl,
  formatExperienceRange,
  fullName as fullNameOf,
  prettyUrl,
} from "@/components/contact-detail/shared/utils";

type Props = {
  contactId?: number;
  contactSlug?: string;
};

const dropCapClass = css({
  "& > p:first-child::first-letter": {
    float: "left",
    fontSize: "5em",
    lineHeight: "0.85",
    paddingRight: "0.08em",
    paddingTop: "0.06em",
    fontWeight: "bold",
  },
});

const proseColumnClass = css({
  maxWidth: "68ch",
});

const timelineRowClass = css({
  py: "3",
});

const inlineLinkRow = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1",
});

export function ContactDetailEditorial(props: Props) {
  const { contactId, contactSlug } = props;

  const { data, loading } = useGetContactQuery({
    variables: contactId
      ? { id: contactId }
      : { slug: contactSlug ?? "" },
    skip: !contactId && !contactSlug,
    fetchPolicy: "cache-and-network",
  });

  const contact = data?.contact ?? null;

  const linkedinHref = useMemo(
    () => coerceExternalUrl(contact?.linkedinUrl),
    [contact?.linkedinUrl],
  );
  const githubHref = useMemo(
    () =>
      contact?.githubHandle
        ? `https://github.com/${contact.githubHandle.replace(/^@/, "")}`
        : null,
    [contact],
  );
  const homepageHref = useMemo(
    () => coerceExternalUrl(contact?.homepageUrl ?? null),
    [contact?.homepageUrl],
  );
  const cleanTags = useMemo(
    () => cleanContactTags(contact?.tags ?? []),
    [contact?.tags],
  );

  if (loading && !contact) {
    return (
      <Container size="3" p="8">
        <Text color="gray">Loading…</Text>
      </Container>
    );
  }

  if (!contact) {
    return (
      <Container size="3" p="8">
        <Flex direction="column" gap="3">
          <Text size="4" weight="medium">
            Contact not found
          </Text>
          <RadixLink asChild>
            <Link href="/contacts">
              <Flex align="center" gap="1">
                <ArrowLeftIcon />
                <Text size="2">All contacts</Text>
              </Flex>
            </Link>
          </RadixLink>
        </Flex>
      </Container>
    );
  }

  const name = fullNameOf(contact.firstName, contact.lastName);
  const profile = contact.profile;
  const role = contact.position?.trim();
  const companyName = contact.company?.trim();
  const companyHref = contact.companyKey || contact.companyId
    ? `/companies/${contact.companyKey ?? contact.companyId}`
    : null;
  const headline = profile?.linkedinHeadline?.trim();

  const additionalEmails = (contact.emails ?? []).filter(
    (e) => e && e !== contact.email,
  );

  const aiRepos = profile?.githubAiRepos ?? [];
  const workExperience = profile?.workExperience ?? [];
  const researchAreas = profile?.researchAreas ?? [];
  const skills = profile?.skills ?? [];
  const topLanguages = profile?.githubTopLanguages ?? [];

  return (
    <Container size="4" p={{ initial: "4", md: "6" }}>
      <Flex direction="column" gap="6">
        {/* Back link */}
        <RadixLink asChild color="gray">
          <Link href="/contacts" style={{ textDecoration: "none" }}>
            <Flex align="center" gap="1">
              <ArrowLeftIcon />
              <Text size="2" color="gray">
                All contacts
              </Text>
            </Flex>
          </Link>
        </RadixLink>

        {/* Hero */}
        <Flex direction="column" gap="3" align="start">
          <Flex align="center" gap="4" wrap="wrap">
            <ContactAvatar
              firstName={contact.firstName}
              lastName={contact.lastName}
              size="6"
            />
            <Heading
              size="9"
              style={{
                fontFamily: "var(--font-instrument)",
                fontWeight: 400,
                lineHeight: 1.05,
                overflowWrap: "break-word",
              }}
            >
              {name}
            </Heading>
          </Flex>

          {(role || companyName || headline) && (
            <Text size="6" color="gray" as="p" className={proseColumnClass}>
              <Em>
                {role ? role : null}
                {role && companyName ? " at " : null}
                {companyName ? (
                  companyHref ? (
                    <RadixLink asChild color="gray" highContrast>
                      <Link href={companyHref}>{companyName}</Link>
                    </RadixLink>
                  ) : (
                    companyName
                  )
                ) : null}
                {!role && !companyName && headline ? headline : null}
              </Em>
            </Text>
          )}

          {role && companyName && headline && (
            <Text size="3" color="gray" as="p" className={proseColumnClass}>
              <Em>{headline}</Em>
            </Text>
          )}

          {/* Inline links row */}
          <Flex gap="4" wrap="wrap" align="center" mt="1">
            {linkedinHref && (
              <RadixLink
                href={linkedinHref}
                target="_blank"
                rel="noopener noreferrer"
                color="gray"
                size="2"
                className={inlineLinkRow}
              >
                <LinkedInLogoIcon /> LinkedIn
              </RadixLink>
            )}
            {githubHref && (
              <RadixLink
                href={githubHref}
                target="_blank"
                rel="noopener noreferrer"
                color="gray"
                size="2"
                className={inlineLinkRow}
              >
                <GitHubLogoIcon />
                {contact.githubHandle}
              </RadixLink>
            )}
            {homepageHref && (
              <RadixLink
                href={homepageHref}
                target="_blank"
                rel="noopener noreferrer"
                color="gray"
                size="2"
                className={inlineLinkRow}
              >
                <GlobeIcon />
                {prettyUrl(homepageHref)}
              </RadixLink>
            )}
            {contact.doNotContact && (
              <Badge color="red" variant="soft" size="1">
                do not contact
              </Badge>
            )}
          </Flex>
        </Flex>

        {/* Single glass body card */}
        <Box className={glassCard()}>
          <Flex
            gap="6"
            direction={{ initial: "column", md: "row" }}
            align="start"
          >
            {/* Left column — identity */}
            <Box
              flexGrow="0"
              flexShrink="0"
              style={{ flexBasis: "38%", minWidth: 0 }}
              width="100%"
            >
              <Flex direction="column" gap="4">
                {/* Primary email */}
                <Box>
                  <Text
                    size="1"
                    color="gray"
                    weight="medium"
                    className={css({ letterSpacing: "0.1em" })}
                  >
                    EMAIL
                  </Text>
                  <Box mt="1">
                    {contact.email ? (
                      <Flex align="center" gap="2" wrap="wrap">
                        <EnvelopeClosedIcon />
                        <RadixLink href={`mailto:${contact.email}`} size="3">
                          {contact.email}
                        </RadixLink>
                        {contact.emailVerified ? (
                          <Badge color="green" variant="soft" size="1">
                            verified
                          </Badge>
                        ) : contact.nbResult ? (
                          <Badge color="orange" variant="soft" size="1">
                            {contact.nbResult}
                          </Badge>
                        ) : null}
                      </Flex>
                    ) : (
                      <Text size="2" color="gray">
                        No email on file
                      </Text>
                    )}
                  </Box>
                </Box>

                {/* Forwarding alias */}
                {contact.forwardingAlias && (
                  <Box>
                    <Text
                      size="1"
                      color="gray"
                      weight="medium"
                      className={css({ letterSpacing: "0.1em" })}
                    >
                      FORWARDING ALIAS
                    </Text>
                    <Flex align="center" gap="2" mt="1" wrap="wrap">
                      <RadixLink
                        href={`mailto:${contact.forwardingAlias}@vadim.blog`}
                        size="2"
                      >
                        {contact.forwardingAlias}@vadim.blog
                      </RadixLink>
                      {contact.email && (
                        <Text size="1" color="gray">
                          → {contact.email}
                        </Text>
                      )}
                    </Flex>
                  </Box>
                )}

                {/* Additional emails */}
                {additionalEmails.length > 0 && (
                  <Box>
                    <Text
                      size="1"
                      color="gray"
                      weight="medium"
                      className={css({ letterSpacing: "0.1em" })}
                    >
                      ADDITIONAL EMAILS
                    </Text>
                    <Flex direction="column" gap="1" mt="1">
                      {additionalEmails.map((email) => (
                        <RadixLink
                          key={email}
                          href={`mailto:${email}`}
                          size="2"
                          color="gray"
                        >
                          {email}
                        </RadixLink>
                      ))}
                    </Flex>
                  </Box>
                )}

                {/* Bounced emails */}
                {contact.bouncedEmails && contact.bouncedEmails.length > 0 && (
                  <Box>
                    <Text
                      size="1"
                      color="gray"
                      weight="medium"
                      className={css({ letterSpacing: "0.1em" })}
                    >
                      BOUNCED
                    </Text>
                    <Flex direction="column" gap="1" mt="1">
                      {contact.bouncedEmails.map((email) => (
                        <Text key={email} size="2" color="red">
                          {email}
                        </Text>
                      ))}
                    </Flex>
                  </Box>
                )}

                {/* Handles */}
                {(contact.githubHandle || contact.telegramHandle) && (
                  <Box>
                    <Text
                      size="1"
                      color="gray"
                      weight="medium"
                      className={css({ letterSpacing: "0.1em" })}
                    >
                      HANDLES
                    </Text>
                    <Flex direction="column" gap="1" mt="1">
                      {contact.githubHandle && (
                        <Flex align="center" gap="2">
                          <GitHubLogoIcon />
                          <Text size="2">{contact.githubHandle}</Text>
                        </Flex>
                      )}
                      {contact.telegramHandle && (
                        <Flex align="center" gap="2">
                          <Text size="2" color="gray">
                            @
                          </Text>
                          <Text size="2">{contact.telegramHandle}</Text>
                        </Flex>
                      )}
                    </Flex>
                  </Box>
                )}

                {/* Tags */}
                {cleanTags.length > 0 && (
                  <Box>
                    <Text
                      size="1"
                      color="gray"
                      weight="medium"
                      className={css({ letterSpacing: "0.1em" })}
                    >
                      TAGS
                    </Text>
                    <Box mt="2">
                      <CollapsibleChips items={cleanTags} visibleCount={8} />
                    </Box>
                  </Box>
                )}

                {/* Signals */}
                {profile && (
                  <>
                    <Separator size="4" my="1" />
                    <Box>
                      <Text
                        size="1"
                        color="gray"
                        weight="medium"
                        className={css({ letterSpacing: "0.1em" })}
                      >
                        SIGNALS
                      </Text>
                      <Flex direction="column" gap="2" mt="2">
                        {profile.experienceLevel && (
                          <Flex justify="between" align="center" gap="2">
                            <Text size="2" color="gray">
                              Experience
                            </Text>
                            <Badge color="violet" variant="soft" size="1">
                              {profile.experienceLevel}
                            </Badge>
                          </Flex>
                        )}
                        {topLanguages.length > 0 && (
                          <Flex justify="between" align="start" gap="2">
                            <Text size="2" color="gray">
                              Top languages
                            </Text>
                            <Flex gap="1" wrap="wrap" justify="end">
                              {topLanguages.slice(0, 4).map((lang) => (
                                <Badge
                                  key={lang}
                                  color="gray"
                                  variant="soft"
                                  size="1"
                                >
                                  {lang}
                                </Badge>
                              ))}
                            </Flex>
                          </Flex>
                        )}
                        {profile.githubTotalStars > 0 && (
                          <Flex justify="between" align="center" gap="2">
                            <Text size="2" color="gray">
                              Total stars
                            </Text>
                            <Flex align="center" gap="1">
                              <StarIcon />
                              <Text size="2" weight="medium">
                                {profile.githubTotalStars.toLocaleString()}
                              </Text>
                            </Flex>
                          </Flex>
                        )}
                        {aiRepos.length > 0 && (
                          <Flex justify="between" align="center" gap="2">
                            <Text size="2" color="gray">
                              AI repos
                            </Text>
                            <Text size="2" weight="medium">
                              {aiRepos.length}
                            </Text>
                          </Flex>
                        )}
                        {profile.synthesisConfidence != null && (
                          <Flex justify="between" align="center" gap="2">
                            <Text size="2" color="gray">
                              Confidence
                            </Text>
                            <Text size="2" weight="medium">
                              {Math.round(
                                (profile.synthesisConfidence ?? 0) * 100,
                              )}
                              %
                            </Text>
                          </Flex>
                        )}
                      </Flex>
                    </Box>
                  </>
                )}
              </Flex>
            </Box>

            {/* Right column — prose */}
            <Box flexGrow="1" minWidth="0" width="100%">
              <Flex direction="column" gap="5">
                {profile?.linkedinBio ? (
                  <Box className={`${proseColumnClass} ${dropCapClass}`}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => (
                          <Heading as="h1" size="5" weight="bold" mt="4" mb="2">
                            {children}
                          </Heading>
                        ),
                        h2: ({ children }) => (
                          <Heading as="h2" size="4" weight="bold" mt="4" mb="2">
                            {children}
                          </Heading>
                        ),
                        h3: ({ children }) => (
                          <Heading as="h3" size="3" weight="bold" mt="3" mb="1">
                            {children}
                          </Heading>
                        ),
                        p: ({ children }) => (
                          <Text as="p" size="3" mb="3">
                            {children}
                          </Text>
                        ),
                        ul: ({ children }) => (
                          <ul
                            style={{
                              paddingLeft: "1.5em",
                              marginBottom: "0.5em",
                            }}
                          >
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol
                            style={{
                              paddingLeft: "1.5em",
                              marginBottom: "0.5em",
                            }}
                          >
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li style={{ marginBottom: "0.25em" }}>
                            <Text size="3">{children}</Text>
                          </li>
                        ),
                        strong: ({ children }) => <Strong>{children}</Strong>,
                        em: ({ children }) => <Em>{children}</Em>,
                        hr: () => <Separator size="4" my="4" />,
                      }}
                    >
                      {profile.linkedinBio}
                    </ReactMarkdown>
                  </Box>
                ) : profile?.githubBio ? (
                  <Box className={proseColumnClass}>
                    <Text as="p" size="3" color="gray">
                      {profile.githubBio}
                    </Text>
                  </Box>
                ) : (
                  <Text size="3" color="gray">
                    No bio available.
                  </Text>
                )}

                {profile?.synthesisRationale && (
                  <Box className={proseColumnClass}>
                    <Text
                      size="1"
                      color="gray"
                      weight="medium"
                      className={css({ letterSpacing: "0.1em" })}
                    >
                      RATIONALE
                    </Text>
                    <Text as="p" size="2" color="gray" mt="2">
                      {profile.synthesisRationale}
                    </Text>
                  </Box>
                )}

                {profile?.specialization && (
                  <Box>
                    <Text
                      size="1"
                      color="gray"
                      weight="medium"
                      className={css({ letterSpacing: "0.1em" })}
                    >
                      SPECIALIZATION
                    </Text>
                    <Text as="p" size="3" mt="1">
                      {profile.specialization}
                    </Text>
                  </Box>
                )}

                {skills.length > 0 && (
                  <Box>
                    <Text
                      size="1"
                      color="gray"
                      weight="medium"
                      className={css({ letterSpacing: "0.1em" })}
                    >
                      SKILLS
                    </Text>
                    <Box mt="2">
                      <CollapsibleChips
                        items={skills}
                        visibleCount={12}
                        color="blue"
                      />
                    </Box>
                  </Box>
                )}

                {contact.notes && (
                  <Box className={proseColumnClass}>
                    <Text
                      size="1"
                      color="gray"
                      weight="medium"
                      className={css({ letterSpacing: "0.1em" })}
                    >
                      NOTES
                    </Text>
                    <Text
                      as="p"
                      size="2"
                      color="gray"
                      mt="2"
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {contact.notes}
                    </Text>
                  </Box>
                )}
              </Flex>
            </Box>
          </Flex>
        </Box>

        {/* Below-the-fold: work experience timeline */}
        {workExperience.length > 0 && (
          <Box>
            <Heading
              as="h2"
              size="6"
              mb="4"
              style={{
                fontFamily: "var(--font-instrument)",
                fontWeight: 400,
              }}
            >
              Experience
            </Heading>
            <Box>
              {workExperience.map((exp, i) => {
                const range = formatExperienceRange(exp.startDate, exp.endDate);
                return (
                  <Box key={`${exp.company}-${exp.title}-${i}`}>
                    {i > 0 && <Separator size="4" />}
                    <Box className={timelineRowClass}>
                      <Flex
                        align="baseline"
                        gap="2"
                        wrap="wrap"
                        justify="between"
                      >
                        <Flex align="baseline" gap="2" wrap="wrap">
                          <Text size="3" weight="medium">
                            {exp.company}
                          </Text>
                          <Text size="2" color="gray">
                            ·
                          </Text>
                          <Text size="3">{exp.title}</Text>
                          {exp.location && (
                            <>
                              <Text size="2" color="gray">
                                ·
                              </Text>
                              <Text size="2" color="gray">
                                {exp.location}
                              </Text>
                            </>
                          )}
                        </Flex>
                        {(range || exp.duration) && (
                          <Text size="2" color="gray">
                            {range}
                            {exp.duration ? ` · ${exp.duration}` : ""}
                          </Text>
                        )}
                      </Flex>
                      {exp.description && (
                        <Text
                          as="p"
                          size="2"
                          color="gray"
                          mt="2"
                          style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}
                        >
                          {exp.description}
                        </Text>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Below-the-fold: GitHub AI repos */}
        {aiRepos.length > 0 && (
          <Box>
            <Heading
              as="h2"
              size="6"
              mb="4"
              style={{
                fontFamily: "var(--font-instrument)",
                fontWeight: 400,
              }}
            >
              AI repositories
            </Heading>
            <Box>
              {aiRepos.map((repo, i) => (
                <Box key={`${repo.name}-${i}`}>
                  {i > 0 && <Separator size="4" />}
                  <Box className={timelineRowClass}>
                    <Flex
                      align="baseline"
                      gap="2"
                      wrap="wrap"
                      justify="between"
                    >
                      <Flex align="baseline" gap="2" wrap="wrap">
                        {githubHref ? (
                          <RadixLink
                            href={`${githubHref}/${repo.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="3"
                            weight="medium"
                          >
                            {repo.name}
                          </RadixLink>
                        ) : (
                          <Text size="3" weight="medium">
                            {repo.name}
                          </Text>
                        )}
                      </Flex>
                      <Flex align="center" gap="1">
                        <StarIcon />
                        <Text size="2" color="gray">
                          {repo.stars.toLocaleString()}
                        </Text>
                      </Flex>
                    </Flex>
                    {repo.description && (
                      <Text as="p" size="2" color="gray" mt="1">
                        {repo.description}
                      </Text>
                    )}
                    {repo.topics.length > 0 && (
                      <Flex gap="1" wrap="wrap" mt="2">
                        {repo.topics.map((topic) => (
                          <Badge
                            key={topic}
                            color="gray"
                            variant="soft"
                            size="1"
                          >
                            {topic}
                          </Badge>
                        ))}
                      </Flex>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Below-the-fold: research areas as inline chips */}
        {researchAreas.length > 0 && (
          <Box>
            <Heading
              as="h2"
              size="6"
              mb="3"
              style={{
                fontFamily: "var(--font-instrument)",
                fontWeight: 400,
              }}
            >
              Research areas
            </Heading>
            <Flex gap="2" wrap="wrap">
              {researchAreas.map((area) => (
                <Badge key={area} color="purple" variant="soft" size="2">
                  {area}
                </Badge>
              ))}
            </Flex>
          </Box>
        )}
      </Flex>
    </Container>
  );
}
