export async function onRequest({ env }) {
  const url = "https://www.googleapis.com/youtube/v3/search?" + 
    new URLSearchParams({
      key: env.YT_API_KEY,
      part: "snippet",
      channelId: env.YT_CHANNEL_ID,
      order: "date",
      type: "video",
      maxResults: "25"
    });

  const sRes = await fetch(url);
  const sData = await sRes.json();

  const ids = sData.items?.map(v => v.id?.videoId).filter(Boolean) || [];
  if (!ids.length)
    return new Response(JSON.stringify({ error: "no videos" }), { status: 500 });

  const dRes = await fetch("https://www.googleapis.com/youtube/v3/videos?" + 
    new URLSearchParams({
      key: env.YT_API_KEY,
      part: "contentDetails,status",
      id: ids.join(",")
    })
  );

  const dData = await dRes.json();
  const details = new Map(dData.items.map(x => [x.id, x]));

  const cs = sData.items.filter(it => {
    const id = it.id?.videoId;
    const det = details.get(id);
    if (!det) return false;
    if (det.status?.privacyStatus !== "public") return false;

    const iso = det.contentDetails.duration;
    const dur = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const seconds =
      (parseInt(dur?.[1] || 0) * 3600) +
      (parseInt(dur?.[2] || 0) * 60) +
      (parseInt(dur?.[3] || 0));

    return seconds < 60; // Short
  });

  return new Response(JSON.stringify(cs[0] || null), {
    headers: { "Content-Type": "application/json" }
  });
}
