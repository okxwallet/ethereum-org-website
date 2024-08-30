import { Fragment, lazy, Suspense, useState } from "react"
import type { GetStaticProps, InferGetStaticPropsType } from "next"
import NextImage from "next/image"
import { useRouter } from "next/router"
import { useTranslation } from "next-i18next"
import { serverSideTranslations } from "next-i18next/serverSideTranslations"
import { FaDiscord, FaGithub, FaXTwitter } from "react-icons/fa6"
import { MdChevronRight } from "react-icons/md"
import { Flex, Skeleton } from "@chakra-ui/react"

import type {
  AllMetricData,
  BasePageProps,
  CommunityBlog,
  EventCardProps,
  Lang,
  RSSItem,
} from "@/lib/types"
import type { CodeExample, CommunityEventsReturnType } from "@/lib/interfaces"

import BentoBox from "@/components/BentoBox"
import SvgButtonLink from "@/components/Buttons/SvgButtonLink"
import CodeModal from "@/components/CodeModal"
import HomeHero from "@/components/Hero/HomeHero"
import PostPreviewCard from "@/components/Homepage/PostPreviewCard"
import AngleBrackets from "@/components/icons/angle-brackets.svg"
import BlockHeap from "@/components/icons/block-heap.svg"
import Calendar from "@/components/icons/calendar.svg"
import CalendarAdd from "@/components/icons/calendar-add.svg"
import EthTokenIcon from "@/components/icons/eth-token.svg"
import PickWalletIcon from "@/components/icons/eth-wallet.svg"
import Layer2Icon from "@/components/icons/layer-2.svg"
import ChooseNetworkIcon from "@/components/icons/network-layers.svg"
import TryAppsIcon from "@/components/icons/phone-homescreen.svg"
import RoadmapSign from "@/components/icons/roadmap-sign.svg"
import Whitepaper from "@/components/icons/whitepaper.svg"
import { TwImage } from "@/components/Image"
import MainArticle from "@/components/MainArticle"
import PageMetadata from "@/components/PageMetadata"
import PostsSwiper from "@/components/PostsSwiper"
import SwiperCards from "@/components/SwiperCards"
import { TranslatathonBanner } from "@/components/Translatathon/TranslatathonBanner"
import { ButtonLink } from "@/components/ui/buttons/Button"
import {
  Card,
  CardBanner,
  CardContent,
  CardHighlight,
  CardSubTitle,
  CardTitle,
} from "@/components/ui/card"
import Link from "@/components/ui/Link"
import {
  Section,
  SectionBanner,
  SectionContent,
  SectionTag,
  SectionTitle,
} from "@/components/ui/section"
import WindowBox from "@/components/WindowBox"

import { cn } from "@/lib/utils/cn"
import { isValidDate } from "@/lib/utils/date"
import { existsNamespace } from "@/lib/utils/existsNamespace"
import { getLastDeployDate } from "@/lib/utils/getLastDeployDate"
import { polishRSSList } from "@/lib/utils/rss"
import { runOnlyOnce } from "@/lib/utils/runOnlyOnce"
import { getLocaleTimestamp } from "@/lib/utils/time"
import {
  getRequiredNamespacesForPage,
  isLangRightToLeft,
} from "@/lib/utils/translations"

import events from "@/data/community-events.json"

import {
  BASE_TIME_UNIT,
  BLOG_FEEDS,
  BLOGS_WITHOUT_FEED,
  GITHUB_REPO_URL,
  RSS_DISPLAY_COUNT,
} from "@/lib/constants"

import CreateWalletContent from "!!raw-loader!@/data/CreateWallet.js"
import SimpleDomainRegistryContent from "!!raw-loader!@/data/SimpleDomainRegistry.sol"
import SimpleTokenContent from "!!raw-loader!@/data/SimpleToken.sol"
import SimpleWalletContent from "!!raw-loader!@/data/SimpleWallet.sol"
import { fetchCommunityEvents } from "@/lib/api/calendarEvents"
import { fetchEthPrice } from "@/lib/api/fetchEthPrice"
import { fetchGrowThePie } from "@/lib/api/fetchGrowThePie"
import { fetchAttestantPosts } from "@/lib/api/fetchPosts"
import { fetchRSS } from "@/lib/api/fetchRSS"
import { fetchTotalEthStaked } from "@/lib/api/fetchTotalEthStaked"
import { fetchTotalValueLocked } from "@/lib/api/fetchTotalValueLocked"
import EventFallback from "@/public/images/events/event-placeholder.png"
import buildersImage from "@/public/images/heroes/developers-hub-hero.jpg"
import activityImage from "@/public/images/heroes/layer-2-hub-hero.jpg"
import learnImage from "@/public/images/heroes/learn-hub-hero.png"
import communityImage from "@/public/images/heroes/quizzes-hub-hero.png"
import hero from "@/public/images/home/hero.png"

// lazy loaded components
const Codeblock = lazy(() =>
  Promise.all([
    import("@/components/Codeblock"),
    // Add a delay to prevent the skeleton from flashing
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]).then(([module]) => module)
)

const StatsBoxGrid = lazy(() => import("@/components/StatsBoxGrid"))

const cachedEthPrice = runOnlyOnce(fetchEthPrice)
const cachedFetchTotalEthStaked = runOnlyOnce(fetchTotalEthStaked)
const cachedFetchTotalValueLocked = runOnlyOnce(fetchTotalValueLocked)
const cachedXmlBlogFeeds = runOnlyOnce(async () => await fetchRSS(BLOG_FEEDS))
const cachedAttestantBlog = runOnlyOnce(fetchAttestantPosts)
const cachedGrowThePieData = runOnlyOnce(fetchGrowThePie)
const cachedFetchCommunityEvents = runOnlyOnce(fetchCommunityEvents)

type Props = BasePageProps & {
  communityEvents: CommunityEventsReturnType
  metricResults: AllMetricData
  rssData: { rssItems: RSSItem[]; blogLinks: CommunityBlog[] }
}

export const getStaticProps = (async ({ locale }) => {
  const growThePieData = await cachedGrowThePieData()
  const metricResults: AllMetricData = {
    ethPrice: await cachedEthPrice(),
    totalEthStaked: await cachedFetchTotalEthStaked(),
    totalValueLocked: await cachedFetchTotalValueLocked(),
    txCount: growThePieData.txCount,
    txCostsMedianUsd: growThePieData.txCostsMedianUsd,
  }

  const communityEvents = await cachedFetchCommunityEvents()

  // load i18n required namespaces for the given page
  const requiredNamespaces = getRequiredNamespacesForPage("/")

  // check if the translated page content file exists for locale
  const contentNotTranslated = !existsNamespace(locale!, requiredNamespaces[0])

  // load last deploy date to pass to Footer in RootLayout
  const lastDeployDate = getLastDeployDate()
  const lastDeployLocaleTimestamp = getLocaleTimestamp(
    locale as Lang,
    lastDeployDate
  )

  // load RSS feed items
  const xmlBlogs = await cachedXmlBlogFeeds()
  const attestantBlog = await cachedAttestantBlog()
  const polishedRssItems = polishRSSList(attestantBlog, ...xmlBlogs)
  const rssItems = polishedRssItems.slice(0, RSS_DISPLAY_COUNT)

  const blogLinks = polishedRssItems.map(({ source, sourceUrl }) => ({
    name: source,
    href: sourceUrl,
  })) as CommunityBlog[]
  blogLinks.push(...BLOGS_WITHOUT_FEED)

  return {
    props: {
      ...(await serverSideTranslations(locale!, requiredNamespaces)),
      communityEvents,
      contentNotTranslated,
      lastDeployLocaleTimestamp,
      metricResults,
      rssData: { rssItems, blogLinks },
    },
    revalidate: BASE_TIME_UNIT * 24,
  }
}) satisfies GetStaticProps<Props>

const HomePage = ({
  communityEvents,
  metricResults,
  rssData: { rssItems, blogLinks },
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const { t } = useTranslation(["common", "page-index"])
  const { locale, asPath } = useRouter()
  const dir = isLangRightToLeft(locale as Lang) ? "rtl" : "ltr"

  const [isModalOpen, setModalOpen] = useState(false)
  const [activeCode, setActiveCode] = useState(0)

  const toggleCodeExample = (id: number): void => {
    setActiveCode(id)
    setModalOpen(true)
  }

  const codeExamples: CodeExample[] = [
    {
      title: t("page-index:page-index-developers-code-example-title-0"),
      description: t(
        "page-index:page-index-developers-code-example-description-0"
      ),
      codeLanguage: "language-solidity",
      code: SimpleWalletContent,
    },
    {
      title: t("page-index:page-index-developers-code-example-title-1"),
      description: t(
        "page-index:page-index-developers-code-example-description-1"
      ),
      codeLanguage: "language-solidity",
      code: SimpleTokenContent,
    },
    {
      title: t("page-index:page-index-developers-code-example-title-2"),
      description: t(
        "page-index:page-index-developers-code-example-description-2"
      ),
      codeLanguage: "language-javascript",
      code: CreateWalletContent,
    },
    {
      title: t("page-index:page-index-developers-code-example-title-3"),
      description: t(
        "page-index:page-index-developers-code-example-description-3"
      ),
      codeLanguage: "language-solidity",
      code: SimpleDomainRegistryContent,
    },
  ]

  const subHeroCTAs = [
    {
      label: t("page-index:page-index-cta-wallet-label"),
      description: t("page-index:page-index-cta-wallet-description"),
      href: "/wallets/find-wallet/",
      Svg: PickWalletIcon,
      className: "text-primary hover:text-primary-hover", // TODO: Confirm hover style
    },
    {
      label: t("page-index:page-index-cta-get-eth-label"),
      description: t("page-index:page-index-cta-get-eth-description"),
      href: "/get-eth/",
      Svg: EthTokenIcon,
      className: "text-accent-a hover:text-accent-a-hover",
    },
    {
      label: t("page-index:page-index-cta-networks-label"),
      description: t("page-index:page-index-cta-networks-description"),
      href: "/layer-2/", // TODO: Update with new networks page when ready
      Svg: ChooseNetworkIcon,
      className: "text-accent-b hover:text-accent-b-hover",
    },
    {
      label: t("page-index:page-index-cta-dapps-label"),
      description: t("page-index:page-index-cta-dapps-description"),
      href: "/dapps/",
      Svg: TryAppsIcon,
      className: "text-accent-c hover:text-accent-c-hover",
    },
  ]

  const popularTopics = [
    {
      label: t("page-index:page-index-popular-topics-ethereum"),
      Svg: EthTokenIcon,
      href: "/what-is-ethereum/",
    },
    {
      label: t("page-index:page-index-popular-topics-wallets"),
      Svg: PickWalletIcon,
      href: "/wallets/",
    },
    {
      label: t("page-index:page-index-popular-topics-start"),
      Svg: BlockHeap,
      href: "/guides/",
    },
    {
      label: t("page-index:page-index-popular-topics-whitepaper"),
      Svg: Whitepaper,
      href: "/whitepaper/",
    },
    {
      label: t("page-index:page-index-popular-topics-roadmap"),
      Svg: RoadmapSign,
      href: "/roadmap/",
    },
  ]

  const upcomingEvents = events
    .filter((event) => {
      const isValid = isValidDate(event.endDate)
      const isUpcoming =
        new Date(event.endDate).getTime() > new Date().getTime()
      return isValid && isUpcoming
    })
    .sort(
      (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
    )
    .slice(0, 3) as EventCardProps[] // Show 3 events ending soonest

  const calendar = communityEvents.upcomingEventData
    .sort((a, b) => {
      const dateA = isValidDate(a.date) ? new Date(a.date).getTime() : -Infinity
      const dateB = isValidDate(b.date) ? new Date(b.date).getTime() : -Infinity
      return dateA - dateB
    })
    .slice(0, 4) // Show next 4 events on the calendar

  const joinActions = [
    {
      Svg: Layer2Icon,
      label: t("page-index:page-index-join-action-contribute-label"),
      href: "/contributing/",
      className: "text-accent-c hover:text-accent-c-hover",
      description: t(
        "page-index:page-index-join-action-contribute-description"
      ),
    },
    {
      Svg: FaGithub,
      label: "GitHub",
      href: GITHUB_REPO_URL,
      className: "text-accent-a hover:text-accent-a-hover",
      description: t("page-index:page-index-join-action-github-description"),
    },
    {
      Svg: FaDiscord,
      label: "Discord",
      href: "/discord/",
      className: "text-primary hover:text-primary-hover",
      description: t("page-index:page-index-join-action-discord-description"),
    },
    {
      Svg: FaXTwitter,
      label: "X",
      href: "https://x.com/EthDotOrg",
      className: "text-accent-b hover:text-accent-b-hover",
      description: t("page-index:page-index-join-action-twitter-description"),
    },
  ]

  return (
    <Flex
      as={MainArticle}
      flexDirection="column"
      alignItems="center"
      dir={dir}
      width="full"
    >
      <PageMetadata
        title={t("page-index:page-index-meta-title")}
        description={t("page-index:page-index-meta-description")}
      />
      <TranslatathonBanner pathname={asPath} />
      <HomeHero heroImg={hero} className="w-full" />
      <div className="w-full space-y-16 px-4 sm:px-6 md:space-y-32">
        <div className="my-20 grid w-full grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-10">
          {subHeroCTAs.map(({ label, description, href, className, Svg }) => (
            <Fragment key={label}>
              <SvgButtonLink
                Svg={Svg}
                href={href}
                label={label}
                className={cn("xl:hidden", className)}
                variant="col"
              >
                <p className="text-body">{description}</p>
              </SvgButtonLink>
              <SvgButtonLink
                Svg={Svg}
                href={href}
                label={label}
                className={cn("hidden xl:block", className)}
                variant="row"
              >
                <p className="text-body">{description}</p>
              </SvgButtonLink>
            </Fragment>
          ))}
        </div>

        {/* Mobile */}
        <SwiperCards className="lg:hidden" />

        {/* Desktop */}
        <BentoBox className="hidden lg:block" />

        <Section>
          <SectionBanner>
            <NextImage src={activityImage} alt="" />
          </SectionBanner>

          <SectionContent>
            <SectionTag>{t("page-index:page-index-activity-tag")}</SectionTag>
            <SectionTitle>
              {t("page-index:page-index-activity-title")}
            </SectionTitle>
            <div className="py-16 lg:py-32">
              <p className="mt-8 text-xl font-bold">
                {t("page-index:page-index-activity-description")}
              </p>
              <StatsBoxGrid metricResults={metricResults} />
            </div>
          </SectionContent>
        </Section>

        <Section className="md:flex-row-reverse">
          <SectionBanner>
            <NextImage src={learnImage} alt="" />
          </SectionBanner>

          <SectionContent>
            <SectionTag>{t("page-index:page-index-learn-tag")}</SectionTag>
            <SectionTitle>
              {t("page-index:page-index-learn-title")}
            </SectionTitle>
            <div className="flex flex-col gap-y-16 lg:gap-y-32">
              <p className="text-lg">
                {t("page-index:page-index-learn-description")}
              </p>
              <div className="flex flex-col gap-y-8">
                <h3 className="text-xl font-bold">
                  {t("page-index:page-index-popular-topics-header")}
                </h3>
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                  {popularTopics.map(({ label, Svg, href }) => (
                    <SvgButtonLink
                      key={label}
                      Svg={Svg}
                      href={href}
                      className="text-accent-b hover:text-accent-b-hover [&>:first-child]:flex-row"
                    >
                      <p className="text-start text-xl font-bold text-body group-hover:underline">
                        {label}
                      </p>
                    </SvgButtonLink>
                  ))}
                </div>
                <div className="flex justify-center py-8 md:justify-start">
                  <ButtonLink href="/learn/" size="lg">
                    {t("page-index:page-index-popular-topics-action")}{" "}
                    <MdChevronRight />
                  </ButtonLink>
                </div>
              </div>
            </div>{" "}
          </SectionContent>
        </Section>

        {/* TODO: Add "The Internet Is Changing" section */}

        <Section>
          <SectionBanner>
            <NextImage src={buildersImage} alt="" />
          </SectionBanner>

          <SectionContent>
            <SectionTag>{t("page-index:page-index-builders-tag")}</SectionTag>
            <SectionTitle>
              {t("page-index:page-index-builders-title")}
            </SectionTitle>
            <p className="text-lg">
              {t("page-index:page-index-builders-description")}
            </p>
            <div className="flex flex-wrap gap-6 py-8">
              <ButtonLink href="/developers/" size="lg" className="w-fit">
                {t("page-index:page-index-builders-action-primary")}{" "}
                <MdChevronRight />
              </ButtonLink>
              <ButtonLink
                href="/developers/docs/"
                size="lg"
                variant="outline"
                className="w-fit"
              >
                {t("page-index:page-index-builders-action-secondary")}
              </ButtonLink>
            </div>
            <div className="py-8 md:pb-16 md:pt-8 lg:pb-32 lg:pt-16">
              <WindowBox
                title={t("page-index:page-index-developers-code-examples")}
                Svg={AngleBrackets}
              >
                {codeExamples.map(({ title, description }, idx) => (
                  <button
                    key={title}
                    className="flex flex-col gap-y-0.5 border-t px-6 py-4 hover:bg-background-highlight"
                    onClick={() => toggleCodeExample(idx)}
                  >
                    <p className="font-bold">{title}</p>
                    <p className="text-start text-sm text-body-medium">
                      {description}
                    </p>
                  </button>
                ))}
              </WindowBox>
            </div>

            {isModalOpen && (
              // TODO: Migrate CodeModal, CodeBlock, Skeleton from Chakra-UI to tailwind/shad-cn
              <CodeModal
                isOpen={isModalOpen}
                setIsOpen={setModalOpen}
                title={codeExamples[activeCode].title}
              >
                <Suspense fallback={<Skeleton />}>
                  <Codeblock
                    codeLanguage={codeExamples[activeCode].codeLanguage}
                    allowCollapse={false}
                    fromHomepage
                  >
                    {codeExamples[activeCode].code}
                  </Codeblock>
                </Suspense>
              </CodeModal>
            )}
          </SectionContent>
        </Section>

        <Section className="md:flex-row-reverse">
          <SectionBanner>
            <NextImage src={communityImage} alt="" />
          </SectionBanner>

          <SectionContent>
            <SectionTag>{t("page-index:page-index-community-tag")}</SectionTag>
            <SectionTitle>
              {t("page-index:page-index-community-title")}
            </SectionTitle>
            <div className="mt-8 flex flex-col gap-8 text-lg">
              <p>{t("page-index:page-index-community-description-1")}</p>
              <p>{t("page-index:page-index-community-description-2")}</p>
              <p>{t("page-index:page-index-community-description-3")}</p>
            </div>
            <div className="flex flex-wrap gap-3 py-8">
              <ButtonLink href="/community/" size="lg">
                {t("page-index:page-index-community-action")} <MdChevronRight />
              </ButtonLink>
              <div className="flex gap-3">
                <ButtonLink
                  href="/discord/"
                  size="lg"
                  variant="outline"
                  hideArrow
                >
                  <FaDiscord />
                </ButtonLink>
                <ButtonLink
                  href={GITHUB_REPO_URL}
                  size="lg"
                  variant="outline"
                  hideArrow
                >
                  <FaGithub />
                </ButtonLink>
              </div>
            </div>
            <div className="py-8 md:pt-8 lg:pt-16">
              <WindowBox
                title={t("page-index:page-index-calendar-title")}
                Svg={Calendar}
              >
                {calendar.length > 0 ? (
                  calendar.map(({ date, title, calendarLink }) => (
                    <div
                      key={title}
                      className="flex flex-col justify-between gap-6 border-t px-6 py-4 xl:flex-row"
                    >
                      <div className="flex flex-col gap-y-0.5 text-center text-base sm:text-start">
                        <a
                          href={calendarLink}
                          className="text-sm font-bold text-body no-underline hover:underline"
                        >
                          {title}
                        </a>
                        <p className="italic text-body-medium">
                          {new Intl.DateTimeFormat(locale, {
                            month: "long",
                            day: "2-digit",
                            year: "numeric",
                            hour: "numeric",
                            minute: "numeric",
                          }).format(new Date(date))}
                        </p>
                      </div>
                      <ButtonLink
                        className="h-fit w-full text-nowrap px-5 sm:w-fit xl:self-center"
                        size="md"
                        variant="outline"
                        href={calendarLink}
                        hideArrow
                      >
                        <CalendarAdd />{" "}
                        {t("page-index:page-index-calendar-add")}
                      </ButtonLink>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col justify-between gap-6 border-t px-6 py-4 lg:flex-row">
                    {t("page-index:page-index-calendar-fallback")}
                  </div>
                )}
              </WindowBox>
            </div>{" "}
          </SectionContent>
        </Section>

        <div className="w-full">
          <h3 className="mb-4 mt-2 text-4xl font-black lg:text-5xl">
            {t("page-index:page-index-posts-header")}
          </h3>
          <p>{t("page-index:page-index-posts-subtitle")}</p>
          {/* Mobile */}
          <PostsSwiper items={rssItems} className="mt-4 md:hidden" />

          {/* Desktop */}
          <div className="hidden gap-8 md:mt-16 md:grid md:grid-cols-3">
            {rssItems.map((post) => (
              <PostPreviewCard key={post.title} {...post} />
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-4 rounded-2xl border p-8">
            <p className="text-lg">{t("page-index:page-index-posts-action")}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-4">
              {blogLinks.map(({ name, href }) => (
                <Link href={href} key={name}>
                  {name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full">
          <h3 className="mb-4 mt-2 text-4xl font-black lg:text-5xl">
            {t("page-index:page-index-events-header")}
          </h3>
          <p>{t("page-index:page-index-events-subtitle")}</p>
          <div className="mt-4 md:mt-16">
            <div className="grid grid-cols-1 gap-8 self-stretch sm:grid-cols-2 md:grid-cols-3">
              {upcomingEvents.map(
                (
                  {
                    title,
                    href,
                    location,
                    description,
                    startDate,
                    endDate,
                    imageUrl,
                  },
                  idx
                ) => (
                  <Card
                    key={title + description}
                    href={href}
                    className={cn(
                      idx === 0 && "col-span-1 sm:col-span-2 md:col-span-1"
                    )}
                  >
                    <CardBanner>
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt=""
                          className="max-w-full object-cover object-center"
                        />
                      ) : (
                        <TwImage src={EventFallback} alt="" />
                      )}
                    </CardBanner>
                    <CardContent>
                      <CardTitle>{title}</CardTitle>
                      <CardSubTitle>
                        {(isValidDate(startDate) || isValidDate(endDate)) &&
                          new Intl.DateTimeFormat(locale, {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          }).formatRange(
                            new Date(
                              isValidDate(startDate) ? startDate : endDate
                            ),
                            new Date(isValidDate(endDate) ? endDate : startDate)
                          )}
                      </CardSubTitle>
                      <CardHighlight>{location}</CardHighlight>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          </div>
          <div className="flex justify-center py-8 md:justify-start">
            <ButtonLink href="/community/events/" size="lg" className="mx-auto">
              {t("page-index:page-index-events-action")} <MdChevronRight />
            </ButtonLink>
          </div>
        </div>

        <div
          className={cn(
            "before:absolute before:-inset-px before:bottom-0 before:z-hide before:rounded-4xl before:content-['']", // Border/gradient positioning
            "before:bg-gradient-to-b before:from-primary-hover/[0.24] before:to-primary-hover/[0.08] before:dark:from-primary-hover/40 before:dark:to-primary-hover/20", // Border/gradient coloring
            "relative inset-0 rounded-4xl bg-background" // Paint background color over card portion
          )}
        >
          <div className="mb-12 flex flex-col gap-y-8 rounded-4xl bg-radial-a px-4 py-8 lg:mb-32 xl:mb-36">
            <div className="flex flex-col gap-y-4 text-center">
              <h2>{t("page-index:page-index-join-header")}</h2>
              <p>{t("page-index:page-index-join-description")}</p>
            </div>
            <div className="mx-auto grid grid-cols-1 gap-16 md:max-w-screen-md md:grid-cols-2">
              {joinActions.map(
                ({ Svg, label, href, className, description }) => (
                  <SvgButtonLink
                    key={label}
                    Svg={Svg}
                    label={label}
                    href={href}
                    className={cn("max-w-screen-sm", className)}
                    variant="row"
                  >
                    <p className="text-body">{description}</p>
                  </SvgButtonLink>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </Flex>
  )
}

export default HomePage
