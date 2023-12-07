import * as S from "@effect/schema/Schema";
import { PaginatedResponse } from "./pagination";

export const CampaignEvent = S.struct({
  title: S.string,
  type: S.union(S.literal("physical"), S.string),
  location_name: S.string,
  address_formatted: S.string,
  google_place_id: S.string,
  start_at: S.string,
  end_at: S.string,
  timezone: S.string,
  details: S.nullable(S.string),
  private: S.boolean,
  tickets_required: S.boolean,
  livestream: S.nullable(S.string),
  livestream_start_at: S.nullable(S.string),
  livestream_end_at: S.nullable(S.string),
});

export const CoverImage = S.struct({
  url: S.string,
  type: S.literal("image"),
  source: S.literal("upload"),
});
export const CoverVideo = S.struct({
  url: S.string,
  type: S.literal("video"),
  source: S.literal("youtube"),
  embed_url: S.string,
});
export const Cover = S.union(CoverImage, CoverVideo);

export const Campaign = S.struct({
  id: S.number,
  code: S.string,
  type: S.literal("general", "collect", "fundraise", "event"),
  status: S.literal("active", "inactive", "unpublished"),
  title: S.string,
  subtitle: S.nullable(S.string),
  description: S.nullable(S.string),
  slug: S.nullable(S.string),
  raised: S.number,
  goal: S.nullable(S.number),
  donors: S.number,
  end_at: S.nullable(S.string),
  url: S.string,
  currency: S.literal("USD"),
  cover: S.optional(S.nullable(Cover)),
  created_at: S.string,
  updated_at: S.string,
  account_id: S.string,
  event: S.optional(S.nullable(CampaignEvent)),
});

export function getCampaignsUrl(
  scope: "benefiting" | "chapters" | "all" | null = "all",
) {
  const prefix = "https://api.givebutter.com/v1/campaigns";
  return [scope ? `${prefix}?scope=${scope}` : prefix, Campaign] as const;
}

export const GetCampaignsResponse = PaginatedResponse(Campaign);

export const EXAMPLE_CAMPAIGN_RESPONSE: S.Schema.To<
  typeof GetCampaignsResponse
> = {
  data: [
    {
      id: 178137,
      code: "7EJRGQ",
      account_id: "ObrdKSCDbIdnVwVG",
      type: "fundraise",
      title: "Giving Tuesday 2023",
      subtitle:
        "Help us raise $5,000 to provide quality computer science education for 5 underserved Bay Area high school students",
      description:
        "<h1><strong style=\"box-sizing: border-box; font-weight: 600; color: var(--text-primary); border: 0px solid rgb(217, 217, 227);\">Empower tomorrow's tech leaders with Mission Bit! 🚀</strong></h1>\n<p style=\"box-sizing: border-box; margin: 1.25em 0px; color: var(--text-primary); font-family: S&ouml;hne, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif, 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; font-size: 16px; white-space: pre-wrap; border: 0px solid rgb(217, 217, 227);\">This Giving Tuesday, join us in making a lasting impact on the lives of underserved high school students in the Bay Area. At Mission Bit, we believe that every student deserves access to quality computer science education, regardless of their background. Our mission is to bridge the digital divide and unlock the potential of the next generation of tech leaders.</p>\n<p style=\"box-sizing: border-box; margin: 1.25em 0px; color: var(--text-primary); font-family: S&ouml;hne, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif, 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; font-size: 16px; white-space: pre-wrap; border: 0px solid rgb(217, 217, 227);\">🖥️ <strong style=\"box-sizing: border-box; font-weight: 600; color: var(--text-primary); border: 0px solid rgb(217, 217, 227);\">Why Mission Bit matters:</strong></p>\n<p style=\"box-sizing: border-box; margin: 1.25em 0px; color: var(--text-primary); font-family: S&ouml;hne, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif, 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; font-size: 16px; white-space: pre-wrap; border: 0px solid rgb(217, 217, 227);\">In the heart of the Bay Area, the tech capital of the world, opportunities in computer science should be accessible to all. Unfortunately, many high school students from underserved communities face barriers to entering the world of coding and programming. Mission Bit is changing that narrative. We provide hands-on, immersive computer science programs that equip students with the skills and confidence to thrive in the digital age.</p>\n<p style=\"box-sizing: border-box; margin: 1.25em 0px; color: var(--text-primary); font-family: S&ouml;hne, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif, 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; font-size: 16px; white-space: pre-wrap; border: 0px solid rgb(217, 217, 227);\">🎓 <strong style=\"box-sizing: border-box; font-weight: 600; color: var(--text-primary); border: 0px solid rgb(217, 217, 227);\">Our goal: $5000 for 5 students!</strong></p>\n<p style=\"box-sizing: border-box; margin: 1.25em 0px; color: var(--text-primary); font-family: S&ouml;hne, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif, 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; font-size: 16px; white-space: pre-wrap; border: 0px solid rgb(217, 217, 227);\">This Giving Tuesday, we're on a mission to raise $5000 to support computer science programming for 5 underserved high school students. Your contribution will directly fund scholarships, learning resources, and mentorship programs that pave the way for these students to pursue futures in technology. Every dollar brings us one step closer to empowering these young minds.</p>\n<p style=\"box-sizing: border-box; margin: 1.25em 0px; color: var(--text-primary); font-family: S&ouml;hne, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif, 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; font-size: 16px; white-space: pre-wrap; border: 0px solid rgb(217, 217, 227);\">🌐 <strong style=\"box-sizing: border-box; font-weight: 600; color: var(--text-primary); border: 0px solid rgb(217, 217, 227);\">How you can help:</strong></p>\n<p style=\"box-sizing: border-box; margin: 0px; border: 0px solid rgb(217, 217, 227);\"><strong style=\"box-sizing: border-box; font-weight: 600; color: var(--tw-prose-bold); border: 0px solid rgb(217, 217, 227);\">Donate:</strong> Your financial support makes a direct impact on the lives of these students. Whether it's $10 or $100, every contribution counts.</p>\n<p style=\"box-sizing: border-box; margin: 0px; border: 0px solid rgb(217, 217, 227);\"><strong style=\"box-sizing: border-box; font-weight: 600; color: var(--tw-prose-bold); border: 0px solid rgb(217, 217, 227);\">Spread the word:</strong> Share our campaign on social media, email, or with your community. Awareness is key to building a network of support.</p>\n<p style=\"box-sizing: border-box; margin: 0px; border: 0px solid rgb(217, 217, 227);\"><strong style=\"box-sizing: border-box; font-weight: 600; color: var(--tw-prose-bold); border: 0px solid rgb(217, 217, 227);\">Volunteer:</strong> If you're passionate about empowering the next generation of tech leaders, consider volunteering your time and skills with Mission Bit.</p>\n<p style=\"box-sizing: border-box; margin: 1.25em 0px; color: var(--text-primary); font-family: S&ouml;hne, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif, 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; font-size: 16px; white-space: pre-wrap; border: 0px solid rgb(217, 217, 227);\">🤝 <strong style=\"box-sizing: border-box; font-weight: 600; color: var(--text-primary); border: 0px solid rgb(217, 217, 227);\">Together, we can make a difference!</strong></p>\n<p style=\"box-sizing: border-box; margin: 1.25em 0px; color: var(--text-primary); font-family: S&ouml;hne, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif, 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; font-size: 16px; white-space: pre-wrap; border: 0px solid rgb(217, 217, 227);\">Join us in building a more inclusive and diverse tech industry. Together, we can break down barriers and provide opportunities for students who are ready to shape the future. Your support on Giving Tuesday will create a ripple effect of positive change in our community.</p>\n<p style=\"box-sizing: border-box; margin: 1.25em 0px; color: var(--text-primary); font-family: S&ouml;hne, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif, 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; font-size: 16px; white-space: pre-wrap; border: 0px solid rgb(217, 217, 227);\">🔗 <strong style=\"box-sizing: border-box; font-weight: 600; color: var(--text-primary); border: 0px solid rgb(217, 217, 227);\">Donate now and be a part of the Mission Bit movement!</strong></p>\n<p style=\"box-sizing: border-box; margin: 1.25em 0px; color: var(--text-primary); font-family: S&ouml;hne, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif, 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; font-size: 16px; white-space: pre-wrap; border: 0px solid rgb(217, 217, 227);\">Thank you for being a catalyst for change and investing in the potential of underserved students in the Bay Area!</p>\n<p>Find out more about Mission Bit here: <a href=\"https://missionbit.org/about/\">https://missionbit.org/about/</a></p>",
      slug: "7eJRgQ",
      url: "https://givebutter.com/7eJRgQ",
      goal: 5000,
      raised: 501,
      donors: 2,
      currency: "USD",
      cover: {
        url: "https://givebutter.s3.amazonaws.com/media/AlN7X0C8hVesm3Zh9EAEi0VdxDel6ZbElr1Soo5o.png",
        type: "image",
        source: "upload",
      },
      status: "active",
      end_at: null,
      created_at: "2023-11-20T18:10:30+00:00",
      updated_at: "2023-11-22T18:11:16+00:00",
    },
    {
      id: 173909,
      code: "JMTJNI",
      account_id: "ObrdKSCDbIdnVwVG",
      type: "collect",
      title: "Bits of Change Monthly Giving Community",
      subtitle:
        "Join our compassionate community of monthly donors and make a lasting impact on our students' journey to success in STEM.",
      description:
        '<p dir="ltr"><span>Join our monthly donor community and play a pivotal role in shaping the future of tech education. Your consistent support ensures our students’ success while providing you with exclusive insights into our goals, metrics, and inspiring student stories. Together, we can significantly impact the path to innovation and excellence in STEM.</span></p><p dir="ltr"><br></p><p dir="ltr"><span>By contributing a small monthly gift, you become a warm and integral part of our student\'s journey, creating a lasting impact as they blossom into skilled tech enthusiasts. Your compassionate commitment makes all the difference in empowering their dreams and aspirations.</span></p>',
      slug: "bitsofchange",
      url: "https://givebutter.com/bitsofchange",
      goal: null,
      raised: 0,
      donors: 0,
      currency: "USD",
      cover: {
        url: "https://givebutter.s3.amazonaws.com/media/bGaOLflGYks0AdYk2s0IOLhCmi06DzECi7cQwXah.jpg",
        type: "image",
        source: "upload",
      },
      status: "active",
      end_at: null,
      created_at: "2023-11-08T20:51:54+00:00",
      updated_at: "2023-11-17T00:55:31+00:00",
    },
    {
      id: 172267,
      code: "ASUIS2",
      account_id: "ObrdKSCDbIdnVwVG",
      type: "event",
      title: "Fall 2023 Demo Day",
      subtitle: null,
      description:
        "<p>​During Demo Day, students present their semester-long culminating projects that showcase the core values of Mission Bit. The event provides an opportunity for students to showcase their skills and creativity to a wider audience. It's also a chance for the community to see the impact of Mission Bit's work firsthand. Please join us in celebration of our youth and computer science education!</p>\n<p>​Donate Today: <a href=\"http://missionbit.org/donate\">missionbit.org/donate</a></p>",
      slug: "mbfa23dd",
      url: "https://givebutter.com/mbfa23dd",
      goal: null,
      raised: 75,
      donors: 12,
      currency: "USD",
      cover: {
        url: "https://youtu.be/-EKT4zfyGRQ?si=5IK4PWb_b6u6-8xq",
        type: "video",
        source: "youtube",
        embed_url: "https://www.youtube.com/embed/-EKT4zfyGRQ",
      },
      status: "active",
      end_at: "2023-12-09T08:00:00+00:00",
      event: {
        title: "Mission Bit Fall 2023 Demo Day",
        type: "physical",
        location_name: "Google Community Space",
        address_formatted: "188 The Embarcadero, San Francisco, CA 94105, USA",
        google_place_id: "ChIJ5XZBCmWAhYARIOzZkRyGAug",
        start_at: "2023-12-13 01:30:00",
        end_at: "2023-12-13 03:30:00",
        timezone: "America/Los_Angeles",
        details: null,
        private: true,
        tickets_required: false,
        livestream: null,
        livestream_start_at: null,
        livestream_end_at: null,
      },
      created_at: "2023-11-03T21:41:40+00:00",
      updated_at: "2023-11-22T01:11:38+00:00",
    },
    {
      id: 172264,
      code: "7NQKTF",
      account_id: "ObrdKSCDbIdnVwVG",
      type: "general",
      title: "General Donations",
      subtitle: null,
      description:
        '<h1>About Mission Bit</h1>\n<p>Mission Bit inspires youth of color to explore the world of STEM with project-based computer science education that embraces their identities.</p>\n<p>Find our full about page here: <a href="https://missionbit.org/about/">https://missionbit.org/about/</a></p>',
      slug: null,
      url: "https://givebutter.com/missionbit",
      goal: null,
      raised: 5,
      donors: 1,
      currency: "USD",
      cover: {
        type: "image",
        url: "https://givebutter.s3.amazonaws.com/media/sp4clJMlPXXbdqMZJG4Wt4ArzQobqbNxYaONMPOK.png",
        source: "upload",
      },
      status: "active",
      end_at: null,
      created_at: "2023-11-03T21:34:54+00:00",
      updated_at: "2023-11-16T21:44:52+00:00",
    },
  ],
  links: {
    first: "https://api.givebutter.com/v1/campaigns?scope=all&page=1",
    last: "https://api.givebutter.com/v1/campaigns?scope=all&page=1",
    prev: null,
    next: null,
  },
  meta: {
    current_page: 1,
    from: 1,
    last_page: 1,
    links: [
      {
        url: null,
        label: "&laquo; Previous",
        active: false,
      },
      {
        url: "https://api.givebutter.com/v1/campaigns?scope=all&page=1",
        label: "1",
        active: true,
      },
      {
        url: null,
        label: "Next &raquo;",
        active: false,
      },
    ],
    path: "https://api.givebutter.com/v1/campaigns",
    per_page: 20,
    to: 4,
    total: 4,
    unfiltered_total: 4,
  },
};
