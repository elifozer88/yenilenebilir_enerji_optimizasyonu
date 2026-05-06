import httpx, asyncio, json

async def test():
    headers = {'User-Agent': 'YE-ATLAS/1.0 (izmir-enerji-atlas; elif@deu.edu.tr)'}
    
    # way + relation + node, İzmir bbox: 37.5,26,39.5,29
    query = '''[out:json][timeout:60];
(
  node["power"="plant"]["plant:source"="solar"](37.5,26,39.5,29);
  way["power"="plant"]["plant:source"="solar"](37.5,26,39.5,29);
  relation["power"="plant"]["plant:source"="solar"](37.5,26,39.5,29);
  node["power"="plant"]["plant:source"="wind"](37.5,26,39.5,29);
  way["power"="plant"]["plant:source"="wind"](37.5,26,39.5,29);
  node["power"="generator"]["plant:source"="solar"](37.5,26,39.5,29);
  way["power"="generator"]["generator:source"="solar"](37.5,26,39.5,29);
  way["power"="generator"]["generator:source"="wind"](37.5,26,39.5,29);
);
out center;'''
    
    async with httpx.AsyncClient(headers=headers) as c:
        r = await c.post(
            'https://overpass-api.de/api/interpreter',
            data={'data': query},
            timeout=60
        )
        print(f"Status: {r.status_code}")
        data = r.json()
        elements = data.get('elements', [])
        print(f"Toplam element: {len(elements)}")
        for el in elements[:5]:
            print(json.dumps(el, ensure_ascii=False, indent=2))

asyncio.run(test())


asyncio.run(test())