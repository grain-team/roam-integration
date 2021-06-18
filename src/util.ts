export const IMPORT_LABEL = "Grain Recordings";

export const mockApi = <T extends unknown>(data: T) =>
  new Promise<{ data: T }>((resolve) => {
    setTimeout(() => {
      resolve({ data });
    }, 1000);
  });

export const mockRecordings = [
  {
    id: "e9be387d-af60-4bdb-b101-c53d518bc1e1",
    title: "Internal musings",
    thumbnail:
      "https://media.grain.co/thumbnails/e9be387d-af60-4bdb-b101-c53d518bc1e1/recording_thumb.jpeg?Expires=1623401655&Key-Pair-Id=APKAJVV5JYWNSB7CAGWA&Signature=RvzIJog-fqE~skwyochR-295Z-~GBSoR8jokCGGyn2xZ2IrgWstiQiLWXfXNBkUEfyrxkKBGu0MUXaIr-ABQ9BeG8amy7ryIk8t7JnNClOo2QGD2GDRBMYX0c5WbwrwZjiUrMvDNoWl0xTZgm8PkAIj9PnxYv72hrkFSP2qNbQBMi-6ecjcNt12SdKFVlxWbb0oeq0mQa6rHgYwavTw7edWTjp7ZshRH87~nojjQPmX7-Xdu-dL3-y3zDy-88dmhsDQ6lFsdLWZ~QK1rjcYrwFbeX7H55fv3WixiKD8-VcP58MkHhUBJcehApUiS5W32U4T12BJdBF0rtu3KVntA4w__",
  },
  {
    id: "4650a127-4a2d-409a-b1ea-00514016107c",
    title: "Daysi and I shooting the shit",
    thumbnail:
      "https://media.grain.co/thumbnails/4650a127-4a2d-409a-b1ea-00514016107c/recording_thumb.jpeg?Expires=1623401655&Key-Pair-Id=APKAJVV5JYWNSB7CAGWA&Signature=i6CMVE849HRtXueiks9fuNlSweGscUXUfQgCuwC7LUmt9b0-y-IMBxOdTIS8iCzQ6ADecOcaAMTLb1mQEJE22PhcQnJMGx-7VVCboKS-NjTlqdv~2IJOwrEGnG6CeWHtXParJf3SixnqQloGyfadzvADgxW93GWquzmh~xwsPiN67Of1~llikOzH6h6Pqm65cTIFSsVOAdUiy4q4IOok8io5aWe-XgNQX-dkCbKsz58YZIjDUxP9oNTHUJcP5fGinOwM-CnIqYDx1QUfeqrjgaLEPFxgi400dpk2mN9m8w-munWe0SiqTu9xLqiplDr3Ny9O3TbpYlOQYBIwaEhIaw__",
  },
  {
    id: "95193bf3-2759-46a4-b617-24e196a88156",
    title: "Sample Recording",
    thumbnail:
      "https://media.grain.co/thumbnails/95193bf3-2759-46a4-b617-24e196a88156/recording_thumb.jpeg?Expires=1623401655&Key-Pair-Id=APKAJVV5JYWNSB7CAGWA&Signature=ZteZsyp4SkJItx4ZG7n54piWDoRizxJ9FJPdov9VhyXwHfG9O2jWUuGKuV40M~gXsZlr6B2kJ9d9tJspmG87U6psQ4sTOdy8vEldfcjd0ocIWU4GjjNBsqjuNhTHQPJjy7er-PbwWJiKhMJ79g8FBD1Bd-LdO4Er6U7mlE9R-Czc9l3k903tjcA~YC4jTLjaqauGKBx1I~z7vb75uEBU~GFvUBYOcMP1P0QeXi3naeo0~6fexZIZMtIw2jZKdJ72HTqozpO~wOyXcFh~Fs0exX2eaIVIy1-oAtcknzu-e1NFSL9c0eoKjO3mPP63YmIGx8Bke6zmZUxeZz~cucS5tw__",
  },
];

export const mockHighlights = {
  "4650a127-4a2d-409a-b1ea-00514016107c": [
    {
      text: "I could take notes during???",
      timestamp: 6432,
      url: "https://grain.co/highlight/i2Y06dS7A4ApeNSJo50Yq71C8NWWakbM8mi1Fleo",
    },
    {
      text: "👍",
      timestamp: 15178,
    },
    {
      text: "can someone else take notes",
      timestamp: 116512,
    },
    {
      text: "🚩",
      timestamp: 142609,
    },
    {
      text: "and stuff",
      timestamp: 255913,
    },
  ],
  "e9be387d-af60-4bdb-b101-c53d518bc1e1": [
    {
      text: "second call!",
      timestamp: 0,
      url: undefined,
    },
    {
      text: "weird",
      timestamp: 9094,
    },
    {
      text: "👍",
      timestamp: 14342,
    },
    {
      text: "⭐️",
      timestamp: 18878,
    },
  ],
  "95193bf3-2759-46a4-b617-24e196a88156": [],
} as { [k: string]: { text: string; timestamp: number; url: string }[] };
