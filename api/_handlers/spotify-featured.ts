import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const featuredCollections = [
    {
      id: "37i9dQZF1DXcBWIGoYBM5M",
      name: "Today's Top Hits",
      type: "playlist",
      description: "Jung Kook, Olivia Rodrigo, Billie Eilish, Sabrina Carpenter & the hottest tracks.",
      coverArt: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80",
      trackCount: 50,
    },
    {
      id: "37i9dQZF1DX0XUsuxWHRQd",
      name: "RapCaviar",
      type: "playlist",
      description: "New music from Drake, Kendrick Lamar, Travis Scott, Metro Boomin and 21 Savage.",
      coverArt: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80",
      trackCount: 45,
    },
    {
      id: "37i9dQZF1DX4WYpdgoIcn6",
      name: "Chill Tracks & Lo-Fi",
      type: "playlist",
      description: "Softer beats, organic downtempo rhythms, and relaxing nocturnal grooves.",
      coverArt: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&q=80",
      trackCount: 60,
    },
    {
      id: "37i9dQZF1DXbTxeAdrVG2l",
      name: "All Out 80s & Synthwave",
      type: "playlist",
      description: "Neon retro electro, analog arpeggios, cyberpunk basslines and 80s anthems.",
      coverArt: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&q=80",
      trackCount: 40,
    },
    {
      id: "4m2880jivSbbyEGAKfITCa",
      name: "Random Access Memories",
      type: "album",
      description: "Daft Punk - Iconic Grammy-winning masterwork featuring Get Lucky, Instant Crush & Giorgio.",
      coverArt: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80",
      trackCount: 13,
    },
    {
      id: "2ODvVjeNVweKGdd537Gozp",
      name: "Discovery",
      type: "album",
      description: "Daft Punk - One More Time, Harder Better Faster Stronger, Digital Love.",
      coverArt: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80",
      trackCount: 14,
    },
    {
      id: "37i9dQZF1DX1lVhptIYRda",
      name: "Hot Country",
      type: "playlist",
      description: "The biggest country hits from Nashville, Texas, and across the globe.",
      coverArt: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&q=80",
      trackCount: 48,
    },
    {
      id: "37i9dQZF1DX4sWSpwq3LiO",
      name: "Peaceful Piano",
      type: "playlist",
      description: "Relax and indulge with beautiful, acoustic piano recordings.",
      coverArt: "https://images.unsplash.com/photo-1520523839898-507127054976?w=600&q=80",
      trackCount: 55,
    },
  ];

  res.json({ collections: featuredCollections });
}
