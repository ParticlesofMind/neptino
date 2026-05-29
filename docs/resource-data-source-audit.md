# Resource Data Source Audit

Audit date: 2026-05-24

## Executive Summary

The Resources layer is not fully ready for the product ambition. The current resource cards can display and edit simple content, but high-value teaching resources depend on reliable external data. A teacher should not have to hand-draw the Ottoman Empire in 1845, manually build a century-by-century border timeline, or author animation keyframes from scratch. That work needs source-backed import.

The next major resource milestone should be a **Source Registry**: each resource type gets a constrained search/input layer that only searches sources appropriate to that resource. Example: a Map resource query for `Ottoman Empire 1845` should search historical boundary/gazetteer/map providers, not generic web results. Each imported result should carry source, license, retrieval date, confidence, and revision metadata.

## Ranking Scale

These ranks are starting priors, not permanent truth. The system should treat provider rank as an initial routing signal and improve it through teacher evaluation, source correction history, classroom usefulness, visual accuracy, license clarity, and dispute rates. AI may extract metadata and flag caveats, but it should not be the final judge of source quality.

| Rank | Meaning | Use in Neptino |
|---|---|---|
| S | Authoritative, open, machine-readable, strong provenance, stable enough for product integration. | Default source for generated/imported resources. |
| A | High-quality and useful, but has gaps, attribution burdens, coverage limits, rate limits, or mixed licenses. | Use with license/provenance warnings and fallback sources. |
| B | Useful for enrichment or prototypes, but incomplete, uneven, paid, non-commercial, or source reliability varies. | Opt-in source, never the only source for factual artifacts. |
| C | Good for discovery but not safe enough for automatic asset import without review. | Search preview only; require teacher confirmation. |
| D | Not recommended for production sourcing. | Avoid except as a manual pasted URL with warning. |

## Resource Readiness Snapshot

| Resource | Current readiness | Main gap | Recommended next move |
|---|---:|---|---|
| Text | Medium | Needs citation-aware source import and passage licensing. | Add source picker for public-domain texts, Wikisource, Project Gutenberg, Internet Archive, LOC. |
| Image | Medium | Needs rights filtering, attribution generation, and source provenance. | Use Wikimedia Commons, Europeana metadata, LOC/NYPL public-domain filters. |
| Audio | Low-Medium | Upload/playback exists, but open audio search and transcript generation are not source-backed. | Add Wikimedia Commons, Internet Archive, LibriVox, LOC audio search with license filters. |
| Video | Medium | Embed is easy; licensing and captions/source metadata are weak. | Add YouTube/Vimeo embed only as URL, plus Commons/Internet Archive for downloadable/public-domain video. |
| Animation | Low | No real keyframe authoring, sequencing, or data-driven animation. | Build a Web Animations API keyframe editor and Lottie/dotLottie importer; treat LottieFiles as licensed asset marketplace, not raw open data. |
| Dataset | Low | No source registry, schema inference, or confidence ranking. | Make Dataset the backbone: OWID, World Bank, OECD, UIS, FAOSTAT, IMF, FRED, Wikidata. |
| 3D Model | Low-Medium | Display exists, but source catalog is narrow; need robust Three.js/R3F pipeline, GLB import, attribution. | Use Poly Haven, Smithsonian Open Access, NASA 3D, Sketchfab CC with strict license capture. |
| Map | Low | Current map is a manual lat/lng viewer; historical borders require external temporal geodata. | Add historical map/boundary search: OpenHistoricalMap, WHG, Wikidata, Natural Earth, CShapes, Pleiades/DARE, paid Euratlas fallback. |
| Chart | Medium | Editor works, but data is manually entered. | Add source search/import from Dataset registry with chart preview and citation. |
| Diagram | Medium | Manual builder works, but no entity/relation import. | Use Wikidata/Atlas entities to seed nodes/edges with citations. |
| Document | Medium | URL/embed works, but public-domain document search is absent. | Add Internet Archive, LOC, HathiTrust metadata, Europeana, NYPL while respecting API deprecation. |
| Timeline | Low-Medium | Manual events exist, but no event/time import. | Use Wikidata SPARQL, WHG, source-backed timeline extraction, and teacher review. |

## High-Priority Source Registry

| Rank | Source | Best for resource types | Access pattern | License / reuse posture | Provenance and revision value | Caveats | Integration recommendation |
|---|---|---|---|---|---|---|---|
| S | [Wikidata](https://www.wikidata.org/wiki/Wikidata:Data_access) / [Wikidata Query Service](https://www.wikidata.org/wiki/Wikidata:QUERY) | Dataset, timeline, diagram, map-gazetteer, entity cards | SPARQL endpoint and dumps | Structured data is CC0 | Excellent entity IDs, source claims, multilingual labels, external links; revision history is core to the platform | Data quality varies by item; geometries are uneven; query limits | Make this the primary entity/event graph. Require citation display from claims where possible. |
| S | [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) | Base maps, modern country/state boundaries, choropleths | Static downloads, shapefiles, GeoJSON after conversion | Public domain | Stable, curated cartographic base layers | Modern/generalized only; not enough for historical empires | Bundle as local baseline map data. Use for fast maps and fallbacks. |
| A | [OpenHistoricalMap](https://www.openhistoricalmap.org/) / [OHM API](https://api.openhistoricalmap.org/) | Historical maps, historical roads, historical boundaries | OSM-like API, Overpass-style querying, tiles | Dedicated to public domain except where otherwise noted | Direct fit for time-aware historical geography | Coverage is community-built and uneven; individual objects may have source/license notes | Primary open temporal map source. Display confidence and source tags prominently. |
| A | [World Historical Gazetteer](https://whgazetteer.org/) / [API docs](https://docs.whgazetteer.org/content/technical/apis.html) | Historical place search, names over time, map seeds | Entity API; LPF/GeoJSON-like records; tokens for many endpoints | WHG content generally CC BY 4.0 Non-Commercial unless specified | Strong historical gazetteer model, linked places, temporal metadata | Non-commercial default is a product risk; token/API limits | Use for discovery/reconciliation, not automatic commercial redistribution until legal review. |
| A | [Wikimedia Commons](https://commons.wikimedia.org/wiki/Commons:Project_scope) / [Commons API](https://commons.wikimedia.org/wiki/Commons:Commons_API) | Image, audio, video, historical maps, 3D scans where present | MediaWiki API, structured data | Free media only; individual files may be PD, CC BY, CC BY-SA, etc.; structured file data CC0 | Huge corpus, license metadata per file, educational scope | License must be checked per file; attribution can be complex | Add rights-filtered media search and auto-attribution. Prefer PD/CC0 first. |
| A | [Europeana](https://www.europeana.eu/en/rights/usage-guidelines-for-metadata) | Image, document, audio/video metadata, cultural heritage discovery | API with key | Metadata CC0; content rights vary by provider | Strong aggregator of European GLAM metadata | Content itself may be restricted even if metadata is open | Use as discovery layer; only import assets with permissive rights statements. |
| A | [DPLA](https://dp.la/about/terms-conditions) | Image, document, audio/video metadata, cultural heritage discovery | Metadata API | Metadata dedicated to CC0; content rights vary by provider | Strong US cultural heritage aggregator | Asset reuse depends on source institution rights, not just DPLA metadata | Use as discovery layer alongside Europeana and LOC. |
| A | [Library of Congress APIs](https://www.loc.gov/apis/) | Images, documents, maps, audio, video, primary sources | JSON/YAML APIs | Rights vary by item; LOC exposes rights/advisory info | Very strong primary-source provenance | Not all assets are unrestricted; rights require display and review | Add source search for US/history/literature courses; show rights advisory before import. |
| A | [Internet Archive Metadata API](https://doc-tools.readthedocs.io/en/ia-test-gsod/metadata.html) | Document, audio, video, scanned books, primary-source media | Search and item metadata APIs; downloads | Rights vary by item/collection | Huge pre-LLM public archive with item metadata and file manifests | Metadata quality varies; rights need item-level review | Add as a core archival search source, especially for scans, audio, and public-domain media. |
| A | [Project Gutenberg](https://www.gutenberg.org/ebooks/offline_catalogs.html) | Text, document, literature passages | OPDS, RDF/XML, CSV, MARC, mirrors | Mostly public-domain in the US; terms warn non-US users to verify local copyright | Stable public-domain text corpus with machine-readable metadata | Metadata often lacks original print source edition detail; avoid crawling main site | Use for public-domain texts with edition caveat and landing-page links. |
| A | [Our World in Data Grapher API](https://docs.owid.io/projects/etl/api/chart-api/) | Dataset, chart, map, timeline | `.csv`, `.metadata.json`, `.zip` per chart URL | Chart API data often CC BY 4.0, but many underlying sources have their own terms | Excellent metadata, citations, chart-ready series | Must honor original data provider licenses; Grapher code itself is not freely reusable | Use as a premium open-data UX source for charts with automatic citation. |
| A | [World Bank Indicators API](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392) / [terms](https://www.worldbank.org/en/about/legal/terms-and-conditions) | Dataset, chart, country comparison, map | Indicators API, Data Catalog | Open Data terms for many datasets; attribution required; some API/material restrictions | Strong official development/economic data | Some uses, especially commercial/API redistribution, need careful terms review | Use for official country indicators; cache source metadata and terms per dataset. |
| A | [OECD Data API](https://www.oecd.org/en/data/insights/data-explainers/2024/09/api.html) / [Open Access Policy](https://www.oecd.org/en/about/oecd-open-by-default-policy.html) | Dataset, chart, policy/economics | SDMX API | Default OECD open-access license is generally CC BY 4.0, exceptions possible | High-quality official indicators | Rate limits; terms acceptance; not all content same license | Add for older learners and policy/economics courses. |
| A | [UNESCO UIS Data Browser](https://databrowser.uis.unesco.org/) / [terms](https://databrowser.uis.unesco.org/terms-and-conditions) | Dataset, chart, education indicators | Data Browser/API resources | UIS work licensed CC BY-SA 4.0 with attribution | Official education/science/culture statistics | Share-alike may affect derivative datasets; citation required | Use for education analytics and ISCED-aligned charts. |
| A | [UNdata API](https://data.un.org/Host.aspx?Content=API) | Dataset, chart, demographics/economics/environment | REST/SOAP SDMX API | Governed by UNdata terms | Official UN Statistics Division data and metadata | Some UNdata databases are archived or have uneven update cadence | Use for official UN indicators with dataset-level freshness display. |
| A | [FAOSTAT](https://www.fao.org/faostat/en/) | Dataset, chart, agriculture/geography | API developer portal, downloads | FAO terms apply; free access | Official food/agriculture data, long time series | License review needed per FAO terms/domain | Add for geography, agriculture, climate-food lessons. |
| A | [IMF Data API](https://data.imf.org/en/Resource-Pages/IMF-API) / [usage](https://www.imf.org/en/about/copyright-and-terms) | Dataset, chart, macroeconomics | SDMX APIs | IMF published data has free access/reuse policy with terms | Official macroeconomic data | Account/API details; terms around data usage | Add for economics courses after API key/auth strategy. |
| A | [FRED API](https://fred.stlouisfed.org/docs/api/terms_of_use.html) | Dataset, chart, macroeconomics, US indicators | API key | FRED API terms plus underlying third-party terms | Excellent time-series catalog and metadata | API key and privacy policy obligations for apps | Add for economics chart import, especially US macro and finance indicators. |
| A | [Poly Haven](https://polyhaven.com/license) | 3D model, texture, HDRI, image/background | API/downloads | CC0 assets | Clear licensing, high-quality PBR assets | General-purpose assets, not historical/curricular metadata-rich | Use as default open 3D asset source for environments/materials. |
| A | [Smithsonian Open Access](https://www.si.edu/OpenAccess) | Image, 3D model, document/cultural object | Smithsonian API, 3D Voyager | Open Access assets are reusable without asking; verify item status | Excellent museum metadata and 3D cultural objects | Not every Smithsonian asset is necessarily open; need item-level checks | Add for cultural heritage 3D/image resources with item-level rights display. |
| A | [NASA 3D Resources](https://www.nasa.gov/3d-resources/) | 3D model, image, texture, space/science media | Downloads | Free to download/use; read NASA usage guidelines | Excellent for STEM and space models | NASA imagery has endorsement/logo/personality rights caveats | Add to 3D model search for STEM. |
| A | [Pleiades Places API](https://api.pleiades.stoa.org/) | Ancient places, maps, timelines, diagrams | GeoJSON API | Commonly CC BY; verify per dataset | Scholarly ancient-world gazetteer | Ancient world only | Use for classical history and ancient geography. |
| A | [Digital Atlas of the Roman Empire](https://imperium.ahlfeldt.se/print.php?doc=info_api) | Roman places, ancient maps | GeoJSON API | CC BY-SA 3.0 | Strong specialized ancient geography source | Share-alike; limited domain | Use as specialized source with license warning. |
| B | [CShapes](https://www.dante-project.org/datasets/cshapes) | Historical country boundaries, maps, charts | Shapefile/R package | Creative Commons licensing; verify exact version | Useful for state boundaries from 1946 onward, CShapes 2.0 from 1886 | Not designed for pre-1886 Ottoman 1845; generalized state boundaries | Use for modern/late-modern political boundary timelines, not early modern. |
| B | [IPUMS IHGIS](https://ihgis.ipums.org/) | Historical census tables and boundary files | Website/download, account | Registration/terms | Strong census + GIS pairing | Coverage by country varies; access rules | Use for demographic map/chart resources after account workflow. |
| B | [IPUMS Mosaic historical GIS files](https://mosaic.ipums.org/historical-gis-datafiles) | Historical admin boundaries, Europe examples | Downloads after registration | Non-commercial scientific use with citation | High-value historical GIS pockets | Non-commercial and patchy coverage | Discovery/reference only unless Neptino licensing is cleared. |
| B | [NYPL Digital Collections API](https://api.repo.nypl.org/) | Public-domain images, maps, documents | API with public-domain filter | Public-domain/no-known-US-copyright filter available | High-quality primary-source metadata | API deprecation announced for 2026-08-01; US copyright framing only | Use short-term as public-domain source; avoid deep dependency. |
| B | [LibriVox](https://wiki.librivox.org/) | Audio, text-linked literature resources | Catalog/feed and Internet Archive-hosted audio | Public-domain audio of public-domain texts | Useful narrated classics and primary literature | Volunteer quality varies; public-domain status is US-centered | Use for public-domain audiobook import with narrator and edition metadata. |
| B | [OpenStreetMap](https://www.openstreetmap.org/copyright) | Modern maps, POI, roads, geocoding via third-party services | OSM extracts/APIs/tiles | ODbL | Current geospatial data, very broad | Not historical; ODbL obligations; public tile usage limits | Use as modern geography layer, not as historical empire source. |
| B | [LottieFiles](https://help.lottiefiles.com/animation-licensing-basics-) | Animation assets | Marketplace/API/downloads | Lottie Simple License/free/premium; not pure open-data | Strong ready-made animations | Cannot scrape/redistribute as standalone library; license per item | Use as optional marketplace connector, not default open source registry. |
| B | [Lottie/dotLottie specs](https://lottie.github.io/lottie-spec/dev/specs/format/) / [dotLottie spec](https://dotlottie.io/spec/1.0/) | Animation format support | File import/rendering | Open format/spec | Strong technical format for motion assets | Not a content source by itself | Build our own keyframe editor/import pipeline around this. |
| B | [Rive](https://rive.app/) | Interactive animation authoring | Hosted/editor/runtime platform | Commercial/free-tier product terms | Strong authoring model for stateful interactive animation | Not an open data source; lock-in risk | Consider later as an import/export/runtime option, not as source truth. |
| B | [Sketchfab Download API](https://sketchfab.com/developers/download-api) | 3D model search/download | Authenticated API | Many free models under Creative Commons; license per model | Huge model catalogue | End-user auth required; provenance/IP risk; attribution per model | Use after license capture, filtering, and provenance warnings. |
| B | [MapTiler Cloud](https://docs.maptiler.com/cloud/api/) | Base maps, geocoding, tiles, static maps | Paid/free-tier API | Service license, plan limits | Reliable map service infrastructure | Not a historical data source; usage costs and terms | Consider for production tiles/geocoding, not for historical facts. |
| B | [Mapbox](https://www.mapbox.com/pricing) | Base maps, tiles, geocoding, custom vector tiles | Paid/free-tier APIs | Commercial service terms | Reliable map infrastructure | Costs, lock-in, not a source of historical borders | Consider for hosting/rendering our curated data, not for source truth. |
| B | [ArcGIS Living Atlas](https://location.arcgis.com/help/deployment/) | Curated GIS layers, base maps, thematic maps | ArcGIS services and item pages | Terms vary per item/provider; many require Esri terms/attribution | Rich GIS catalog with provider credits | Mixed licenses, account/plan constraints, not open-source by default | Use as paid/enterprise connector where item-level terms can be displayed. |
| C | [Euratlas Historical Vector Data](https://www.euratlas.net/shop/maps_gis/gis_200.html) | Historical Europe boundary maps | Paid shapefiles by period | Proprietary paid licenses | Valuable for century-level Europe maps | Paid, limited licensing, Europe-focused, not instant open integration | Use as paid fallback or institutional add-on. |
| C | [David Rumsey Map Collection](https://www.davidrumsey.com/static/faq.html) | Historical scanned maps, map imagery | Web/IIIF-like viewing/export patterns vary | Rights vary by item/use | Exceptional historical map imagery | Not always vector data; georeferencing/tracing required; rights checks | Discovery and image/reference layer; not automatic boundary extraction. |
| C | Generic web image/search results | Images, maps, documents | Search engine result pages | Unknown/mixed | Low provenance unless source page is authoritative | High copyright and factual risk | Do not automate import; only allow manual URL with warning. |
| D | Unsourced AI-generated geography or historical boundaries | Map, chart, timeline, dataset | LLM-only output | No reliable source license | Fast but untrustworthy | Hallucinated borders, dates, place names; impossible to audit | Never use as source truth. LLMs may summarize source-backed data only. |

## Historical Map And Ottoman Empire Implications

The Ottoman Empire in 1845 is a good stress test. No single free source guarantees an immediately accurate, teacher-ready polygon for that exact year. A practical Neptino flow should rank and combine:

| Step | Source class | What Neptino should do |
|---|---|---|
| 1 | Open temporal geodata | Query OpenHistoricalMap for Ottoman-related boundaries around 1845; inspect tags, dates, and source references. |
| 2 | Historical gazetteers | Use WHG/Wikidata to identify Ottoman provinces, cities, alternate names, and time spans. |
| 3 | Scanned historical maps | Retrieve public-domain map images from LOC, Wikimedia Commons, NYPL, David Rumsey, Europeana for teacher-visible evidence. |
| 4 | Scholarly/published datasets | If no open vector data exists, offer paid/institutional options such as Euratlas for Europe or domain-specific HGIS collections. |
| 5 | Human review | Show confidence, source differences, and uncertainty. Let the teacher accept, edit, or attach a caution note. |

For historical boundaries, the UI should distinguish **territory directly controlled**, **vassal/suzerain influence**, **claimed territory**, and **campaign/occupation area**. A single filled polygon can be misleading.

## Resource-Specific Source Strategy

| Resource | Search field should constrain to | Best first sources | Import output |
|---|---|---|---|
| Map | Place, year/date, polity, boundary type, certainty | OpenHistoricalMap, Natural Earth, Wikidata, WHG, CShapes, Pleiades/DARE | GeoJSON layer, citation, date span, uncertainty flag |
| Timeline | Entity/topic + time span | Wikidata, WHG, LOC/Europeana/Internet Archive documents | Event list with date precision, source URLs, confidence |
| Chart | Indicator/topic + geography + years | OWID, World Bank, OECD, UIS, FAOSTAT, IMF, FRED | CSV/table, schema, chart preset, citation |
| Dataset | Domain-specific query | Same as chart plus domain repositories | Normalized table, metadata, license, refresh cadence |
| Image | Topic + rights filter | Wikimedia Commons, Europeana, LOC, NYPL, Smithsonian | Image URL/file, alt draft, attribution, rights statement |
| Audio | Topic/person/work + rights filter | Wikimedia Commons, Internet Archive, LOC, LibriVox | Audio URL/file, transcript placeholder, attribution |
| Video | Topic + embeddable/public-domain filter | Wikimedia Commons, Internet Archive, LOC; YouTube/Vimeo for embeds only | Embed/download, captions, attribution |
| 3D Model | Object/domain + license filter + format | Poly Haven, Smithsonian Open Access, NASA 3D, Sketchfab CC | GLB/USDZ, attribution, scale/camera defaults |
| Animation | Concept/process + format/license | Lottie/dotLottie import, LottieFiles marketplace, Neptino keyframe editor | Keyframes/Lottie, playback controls, source/license |
| Diagram | Entity/relation/topic | Wikidata, Atlas, domain ontologies | Nodes/edges with source-backed labels |
| Document | Work/topic + rights filter | LOC, Internet Archive, Europeana, NYPL, public-domain libraries | PDF/IIIF/embed, citation, page metadata |

## Data Ranking Metadata To Store Per Imported Resource

| Field | Purpose |
|---|---|
| `source_id` | Stable provider identifier, e.g. `wikidata`, `ohm`, `owid`, `loc`. |
| `source_url` | Human-verifiable URL. |
| `retrieved_at` | Timestamp for auditability. |
| `license` | Machine-readable license label and URL. |
| `attribution` | Preformatted attribution string. |
| `source_rank` | S/A/B/C/D rank from registry. |
| `confidence` | Provider confidence + Neptino import confidence. |
| `date_precision` | Exact date, year, decade, century, approximate, unknown. |
| `geometry_precision` | Point, bounding box, generalized polygon, precise polygon, raster-only. |
| `revision_id` | Source revision if available, e.g. Wikidata revision, OSM/OHM version. |
| `source_claims` | Links to supporting claims/references for factual statements. |
| `warnings` | License caveat, NC restriction, historical uncertainty, incomplete coverage. |

## Teacher Evaluation Loop

Provider rank should become empirical over time.

| Signal | Meaning | Product use |
|---|---|---|
| Teacher rating | Quick classroom-quality score for a source record or generated card. | Raise or lower source priority by subject, level, and resource type. |
| Accuracy correction | Teacher flags a factual, temporal, geographic, or visual issue. | Mark derived cards as disputed and queue review. |
| Visual quality rating | Teacher judges whether map geometry, charts, media, or diagrams were classroom-ready. | Improve retrieval ranking for visual resources and phase out weak providers. |
| License/rights issue | Teacher or reviewer flags unclear or unsafe reuse. | Suppress automatic import until rights are reviewed. |
| Corroboration count | Multiple independent sources support the same claim or geometry. | Increase confidence and show stronger trust badges. |
| Rejection reason | Teacher rejects a source because it is irrelevant, misleading, too shallow, outdated, or unusable. | Train source selection heuristics without treating AI output as truth. |

Implementation rule: every injected material or composition should carry source records, citations, confidence, warnings, review state, and teacher feedback hooks. The first version can store that payload on card content; mature Atlas should aggregate feedback against `atlas_source_records` and source-specific candidates.

## Implementation Recommendation

1. Build `ResourceSourceRegistry` in code before expanding the editors.
2. Create one normalized search contract: `query`, `resourceType`, `filters`, `licensePolicy`, `dateRange`, `geometryRequired`.
3. Start with four high-value connectors: Wikidata, Natural Earth, Wikimedia Commons, Our World in Data.
4. Add historical map stack next: OpenHistoricalMap, WHG, LOC, Europeana.
5. Make all imports reversible and citation-visible.
6. For Animation, implement a real keyframe model using CSS keyframes and the Web Animations API, plus Lottie/dotLottie import.
7. Add data-quality badges in the resource card: `Authoritative`, `Open`, `Attributed`, `Uncertain`, `Teacher-reviewed`.
8. Never let an LLM invent resource data. Let the LLM choose, summarize, and transform source-backed data only.

## Bottom Line

Resources are display-ready for simple manual creation, but not data-ready for Neptino’s core promise. The product should prioritize source-backed resource generation over more manual editor controls. Animation and 3D need better authoring/rendering engines, but maps, charts, timelines, and datasets need a stronger foundation first: ranked, licensed, provenance-aware data sources.
