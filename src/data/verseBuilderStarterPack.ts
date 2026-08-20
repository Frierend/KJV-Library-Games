import {
  CONTENT_SCHEMA_VERSION,
  type ScriptureCitation,
  type VerseBuilderContentRecord,
  type VerseBuilderSegment,
} from "../content/types";
import { deriveVerseBuilderDifficulty } from "../content/verseBuilder";

const SOURCE_ARTIFACT = "eng-kjv_vpl.zip";
const SOURCE_FILE = "eng-kjv_vpl.xml";
const SOURCE_HASH = "0E2C5C10C808BAFB2A9F55B95A1A0908FB28E71DD67661B367D0F26B7551C39A";

function sourceNote(reference: string) {
  return `SOURCE-VERIFIED / PENDING HUMAN REVIEW. Exact text extracted from ${SOURCE_FILE} in ${SOURCE_ARTIFACT} (eBible.org / CrossWire Bible Society; standardized 1769 King James / Authorized Version; SHA-256 ${SOURCE_HASH}); locator: ${reference}.`;
}

function segment(id: string, text: string): VerseBuilderSegment {
  return { id, text };
}

function verse(
  id: string,
  reference: string,
  citation: ScriptureCitation,
  canonicalText: string,
  segments: readonly VerseBuilderSegment[],
): VerseBuilderContentRecord {
  return {
    id,
    schemaVersion: CONTENT_SCHEMA_VERSION,
    reference,
    referenceText: reference,
    citations: [citation],
    canonicalText,
    segments,
    difficulty: deriveVerseBuilderDifficulty(canonicalText, segments),
    themeIds: [],
    contentPackIds: ["kjventure-core"],
    validation: {
      status: "reviewed",
      reviewer: "Frierend",
      reviewedAt: "2026-08-13",
      sourceNote: sourceNote(reference),
    },
  };
}

export const verseBuilderStarterPack: readonly VerseBuilderContentRecord[] = [
  verse(
    "verse-builder-genesis-1-1",
    "Genesis 1:1",
    { book: "Genesis", chapter: 1, startVerse: 1 },
    "In the beginning God created the heaven and the earth.",
    [
      segment("genesis-1-1-1", "In the beginning"),
      segment("genesis-1-1-2", "God created"),
      segment("genesis-1-1-3", "the heaven"),
      segment("genesis-1-1-4", "and the earth."),
    ],
  ),
  verse(
    "verse-builder-joshua-1-9",
    "Joshua 1:9",
    { book: "Joshua", chapter: 1, startVerse: 9 },
    "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.",
    [
      segment("joshua-1-9-1", "Have not I commanded thee?"),
      segment("joshua-1-9-2", "Be strong and of a good courage;"),
      segment("joshua-1-9-3", "be not afraid,"),
      segment("joshua-1-9-4", "neither be thou dismayed:"),
      segment("joshua-1-9-5", "for the LORD thy God"),
      segment("joshua-1-9-6", "is with thee"),
      segment("joshua-1-9-7", "whithersoever thou goest."),
    ],
  ),
  verse(
    "verse-builder-psalm-23-2",
    "Psalm 23:2",
    { book: "Psalm", chapter: 23, startVerse: 2 },
    "He maketh me to lie down in green pastures: he leadeth me beside the still waters.",
    [
      segment("psalm-23-2-1", "He maketh me to lie down"),
      segment("psalm-23-2-2", "in green pastures:"),
      segment("psalm-23-2-3", "he leadeth me beside"),
      segment("psalm-23-2-4", "the still waters."),
    ],
  ),
  verse(
    "verse-builder-psalm-119-105",
    "Psalm 119:105",
    { book: "Psalm", chapter: 119, startVerse: 105 },
    "Thy word is a lamp unto my feet, and a light unto my path.",
    [
      segment("psalm-119-105-1", "Thy word is a lamp"),
      segment("psalm-119-105-2", "unto my feet,"),
      segment("psalm-119-105-3", "and a light"),
      segment("psalm-119-105-4", "unto my path."),
    ],
  ),
  verse(
    "verse-builder-proverbs-3-5",
    "Proverbs 3:5",
    { book: "Proverbs", chapter: 3, startVerse: 5 },
    "Trust in the LORD with all thine heart; and lean not unto thine own understanding.",
    [
      segment("proverbs-3-5-1", "Trust in the LORD"),
      segment("proverbs-3-5-2", "with all thine heart;"),
      segment("proverbs-3-5-3", "and lean not unto"),
      segment("proverbs-3-5-4", "thine own understanding."),
    ],
  ),
  verse(
    "verse-builder-ecclesiastes-3-1",
    "Ecclesiastes 3:1",
    { book: "Ecclesiastes", chapter: 3, startVerse: 1 },
    "To every thing there is a season, and a time to every purpose under the heaven:",
    [
      segment("ecclesiastes-3-1-1", "To every thing"),
      segment("ecclesiastes-3-1-2", "there is a season,"),
      segment("ecclesiastes-3-1-3", "and a time"),
      segment("ecclesiastes-3-1-4", "to every purpose"),
      segment("ecclesiastes-3-1-5", "under the heaven:"),
    ],
  ),
  verse(
    "verse-builder-micah-6-8",
    "Micah 6:8",
    { book: "Micah", chapter: 6, startVerse: 8 },
    "He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?",
    [
      segment("micah-6-8-1", "He hath shewed thee,"),
      segment("micah-6-8-2", "O man,"),
      segment("micah-6-8-3", "what is good;"),
      segment("micah-6-8-4", "and what doth the LORD"),
      segment("micah-6-8-5", "require of thee,"),
      segment("micah-6-8-6", "but to do justly,"),
      segment("micah-6-8-7", "and to love mercy,"),
      segment("micah-6-8-8", "and to walk humbly"),
      segment("micah-6-8-9", "with thy God?"),
    ],
  ),
  verse(
    "verse-builder-jeremiah-29-11",
    "Jeremiah 29:11",
    { book: "Jeremiah", chapter: 29, startVerse: 11 },
    "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.",
    [
      segment("jeremiah-29-11-1", "For I know the thoughts"),
      segment("jeremiah-29-11-2", "that I think toward you,"),
      segment("jeremiah-29-11-3", "saith the LORD,"),
      segment("jeremiah-29-11-4", "thoughts of peace,"),
      segment("jeremiah-29-11-5", "and not of evil,"),
      segment("jeremiah-29-11-6", "to give you an expected end."),
    ],
  ),
  verse(
    "verse-builder-daniel-2-20",
    "Daniel 2:20",
    { book: "Daniel", chapter: 2, startVerse: 20 },
    "Daniel answered and said, Blessed be the name of God for ever and ever: for wisdom and might are his:",
    [
      segment("daniel-2-20-1", "Daniel answered and said,"),
      segment("daniel-2-20-2", "Blessed be the name of God"),
      segment("daniel-2-20-3", "for ever and ever:"),
      segment("daniel-2-20-4", "for wisdom and might are his:"),
    ],
  ),
  verse(
    "verse-builder-psalm-37-5",
    "Psalm 37:5",
    { book: "Psalm", chapter: 37, startVerse: 5 },
    "Commit thy way unto the LORD; trust also in him; and he shall bring it to pass.",
    [
      segment("psalm-37-5-1", "Commit thy way unto the LORD;"),
      segment("psalm-37-5-2", "trust also in him;"),
      segment("psalm-37-5-3", "and he shall bring it to pass."),
    ],
  ),
  verse(
    "verse-builder-matthew-5-16",
    "Matthew 5:16",
    { book: "Matthew", chapter: 5, startVerse: 16 },
    "Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.",
    [
      segment("matthew-5-16-1", "Let your light"),
      segment("matthew-5-16-2", "so shine before men,"),
      segment("matthew-5-16-3", "that they may see"),
      segment("matthew-5-16-4", "your good works,"),
      segment("matthew-5-16-5", "and glorify your Father"),
      segment("matthew-5-16-6", "which is in heaven."),
    ],
  ),
  verse(
    "verse-builder-matthew-6-33",
    "Matthew 6:33",
    { book: "Matthew", chapter: 6, startVerse: 33 },
    "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.",
    [
      segment("matthew-6-33-1", "But seek ye first"),
      segment("matthew-6-33-2", "the kingdom of God,"),
      segment("matthew-6-33-3", "and his righteousness;"),
      segment("matthew-6-33-4", "and all these things"),
      segment("matthew-6-33-5", "shall be added unto you."),
    ],
  ),
  verse(
    "verse-builder-matthew-7-12",
    "Matthew 7:12",
    { book: "Matthew", chapter: 7, startVerse: 12 },
    "Therefore all things whatsoever ye would that men should do to you, do ye even so to them: for this is the law and the prophets.",
    [
      segment("matthew-7-12-1", "Therefore all things"),
      segment("matthew-7-12-2", "whatsoever ye would"),
      segment("matthew-7-12-3", "that men should do to you,"),
      segment("matthew-7-12-4", "do ye even so to them:"),
      segment("matthew-7-12-5", "for this is the law"),
      segment("matthew-7-12-6", "and the prophets."),
    ],
  ),
  verse(
    "verse-builder-john-3-16",
    "John 3:16",
    { book: "John", chapter: 3, startVerse: 16 },
    "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
    [
      segment("john-3-16-1", "For God so loved the world,"),
      segment("john-3-16-2", "that he gave"),
      segment("john-3-16-3", "his only begotten Son,"),
      segment("john-3-16-4", "that whosoever believeth in him"),
      segment("john-3-16-5", "should not perish,"),
      segment("john-3-16-6", "but have everlasting life."),
    ],
  ),
  verse(
    "verse-builder-romans-8-28",
    "Romans 8:28",
    { book: "Romans", chapter: 8, startVerse: 28 },
    "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.",
    [
      segment("romans-8-28-1", "And we know"),
      segment("romans-8-28-2", "that all things"),
      segment("romans-8-28-3", "work together for good"),
      segment("romans-8-28-4", "to them that love God,"),
      segment("romans-8-28-5", "to them who are the called"),
      segment("romans-8-28-6", "according to his purpose."),
    ],
  ),
  verse(
    "verse-builder-romans-12-2",
    "Romans 12:2",
    { book: "Romans", chapter: 12, startVerse: 2 },
    "And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.",
    [
      segment("romans-12-2-1", "And be not conformed"),
      segment("romans-12-2-2", "to this world:"),
      segment("romans-12-2-3", "but be ye transformed"),
      segment("romans-12-2-4", "by the renewing of your mind,"),
      segment("romans-12-2-5", "that ye may prove"),
      segment("romans-12-2-6", "what is that good,"),
      segment("romans-12-2-7", "and acceptable,"),
      segment("romans-12-2-8", "and perfect,"),
      segment("romans-12-2-9", "will of God."),
    ],
  ),
  verse(
    "verse-builder-hebrews-11-1",
    "Hebrews 11:1",
    { book: "Hebrews", chapter: 11, startVerse: 1 },
    "Now faith is the substance of things hoped for, the evidence of things not seen.",
    [
      segment("hebrews-11-1-1", "Now faith is"),
      segment("hebrews-11-1-2", "the substance"),
      segment("hebrews-11-1-3", "of things hoped for,"),
      segment("hebrews-11-1-4", "the evidence"),
      segment("hebrews-11-1-5", "of things not seen."),
    ],
  ),
  verse(
    "verse-builder-john-13-34",
    "John 13:34",
    { book: "John", chapter: 13, startVerse: 34 },
    "A new commandment I give unto you, That ye love one another; as I have loved you, that ye also love one another.",
    [
      segment("john-13-34-1", "A new commandment I give unto you,"),
      segment("john-13-34-2", "That ye love one another;"),
      segment("john-13-34-3", "as I have loved you,"),
      segment("john-13-34-4", "that ye also love one another."),
    ],
  ),
  verse(
    "verse-builder-1-john-4-7",
    "1 John 4:7",
    { book: "1 John", chapter: 4, startVerse: 7 },
    "Beloved, let us love one another: for love is of God; and every one that loveth is born of God, and knoweth God.",
    [
      segment("1-john-4-7-1", "Beloved,"),
      segment("1-john-4-7-2", "let us love one another:"),
      segment("1-john-4-7-3", "for love is of God;"),
      segment("1-john-4-7-4", "and every one that loveth"),
      segment("1-john-4-7-5", "is born of God,"),
      segment("1-john-4-7-6", "and knoweth God."),
    ],
  ),
  verse(
    "verse-builder-colossians-3-16",
    "Colossians 3:16",
    { book: "Colossians", chapter: 3, startVerse: 16 },
    "Let the word of Christ dwell in you richly in all wisdom; teaching and admonishing one another in psalms and hymns and spiritual songs, singing with grace in your hearts to the Lord.",
    [
      segment("colossians-3-16-1", "Let the word of Christ"),
      segment("colossians-3-16-2", "dwell in you richly"),
      segment("colossians-3-16-3", "in all wisdom;"),
      segment("colossians-3-16-4", "teaching and admonishing one another"),
      segment("colossians-3-16-5", "in psalms and hymns"),
      segment("colossians-3-16-6", "and spiritual songs,"),
      segment("colossians-3-16-7", "singing with grace"),
      segment("colossians-3-16-8", "in your hearts"),
      segment("colossians-3-16-9", "to the Lord."),
    ],
  ),
];
