// ==========================================================================
// STATE MANAGEMENT & CONSTANTS
// ==========================================================================

// ── API Sources ──────────────────────────────────────────────────────────────
// 1. Google News RSS → rss2json converter (keyword search, no API key, CORS-friendly)
const RSS2JSON_API   = "https://api.rss2json.com/v1/api.json";
const GOOGLE_NEWS_RSS_BASE = "https://news.google.com/rss/search";

// 2. GNews API (keyword search, free tier, works on localhost)
//    Sign up FREE at https://gnews.io  → replace the key below
const GNEWS_API_KEY  = "";          // leave blank to skip GNews
const GNEWS_BASE     = "https://gnews.io/api/v4/search";

// 3. Saurav.tech category mirror (category browsing, no search support)
const SAURAV_API_BASE = "https://saurav.tech/NewsAPI/top-headlines/category/";

// 4. Backup offline dataset
const BACKUP_ARTICLES = [
    {
        title: "Global Tech Summit 2026 Focuses on Next-Gen Artificial Intelligence & Ethics",
        description: "Industry leaders, researchers, and policymakers gathered at the international tech forum to establish unified safety guidelines and computational benchmarks for general AI systems.",
        url: "https://techcrunch.com",
        urlToImage: "https://picsum.photos/800/400?random=1",
        publishedAt: new Date().toISOString(),
        source: { name: "Tech Daily" }
    },
    {
        title: "Central Banks Announce Coordinated Rate Adjustments Amid Economic Stabilization",
        description: "Global financial authorities have unveiled new monetary policy frameworks aimed at bolstering sustainable economic growth and curbing inflation spikes across emerging markets.",
        url: "https://bloomberg.com",
        urlToImage: "https://picsum.photos/800/400?random=2",
        publishedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        source: { name: "Financial Post" }
    },
    {
        title: "Breakthrough Discovery in Deep Space Telescope Observations Revealed",
        description: "Astronomers using next-generation spectral imaging have detected atmospheric water vapor signatures on exoplanets situated in habitable orbital zones.",
        url: "https://nasa.gov",
        urlToImage: "https://picsum.photos/800/400?random=3",
        publishedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        source: { name: "Science Journal" }
    },
    {
        title: "National Cricket Team Secures Thrilling Victory in Championship Final",
        description: "In a tense final overs finish, the squad clinched the series trophy with outstanding all-round performances and clutch fielding in front of a packed stadium.",
        url: "https://espncricinfo.com",
        urlToImage: "https://picsum.photos/800/400?random=4",
        publishedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
        source: { name: "Sports World" }
    },
    {
        title: "Renewable Energy Capacity Surpasses Key Milestones Across Solar Grid Operations",
        description: "Solar and wind energy installations have achieved unprecedented output levels this quarter, significantly reducing global grid reliance on fossil fuel backups.",
        url: "https://reuters.com",
        urlToImage: "https://picsum.photos/800/400?random=5",
        publishedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        source: { name: "Eco Report" }
    },
    {
        title: "Medical Researchers Unveil Promising Clinical Trial Results for New Vaccine",
        description: "Advanced phase 3 clinical trials demonstrate high efficacy rates in targeted immunotherapies, offering new avenues for preventive healthcare.",
        url: "https://medicalnewstoday.com",
        urlToImage: "https://picsum.photos/800/400?random=6",
        publishedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
        source: { name: "Health Digest" }
    }
];

// ── App State ─────────────────────────────────────────────────────────────────
let currentCategory     = "general";
let currentSearchKeyword = "";
let fetchedArticlesStore = [];
let displayedCount      = 0;
const ARTICLES_PER_PAGE  = 6;
let isFetching          = false;
let hasMore             = true;

// Suggestions shown while typing in the search box
const SEARCH_SUGGESTIONS = [
    "Delhi protests", "India cricket", "Artificial intelligence",
    "Rajasthan news", "Climate change", "Technology news",
    "Business markets", "Health & fitness", "Space science",
    "India Pakistan", "Budget 2026", "Sports update",
    "Stock market", "Bollywood", "Cyber security"
];

// Local Storage tracking
let bookmarks    = JSON.parse(localStorage.getItem("newsBookmarks")) || [];
let likedArticles = JSON.parse(localStorage.getItem("newsLikes"))   || {};
let userLikesMap  = JSON.parse(localStorage.getItem("userLikesMap")) || {};

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    checkUserStatus();
    updateDateDisplay();
    initTheme();
    updateBookmarksBadge();
    renderBookmarksList();

    window.addEventListener("scroll", handleScrollEffects);
    document.addEventListener("click", handleOuterClickEvents);

    fetchInitialFeed();
});

// ==========================================================================
// SCROLL EFFECTS & INFINITE SCROLL
// ==========================================================================
function handleScrollEffects() {
    const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
    const height    = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled  = height > 0 ? (winScroll / height) * 100 : 0;

    const progressEl = document.getElementById("readingProgress");
    if (progressEl) progressEl.style.width = scrolled + "%";

    const backToTopBtn = document.getElementById("backToTopBtn");
    if (backToTopBtn) {
        backToTopBtn.style.display = winScroll > 300 ? "flex" : "none";
    }

    const headerWrapper = document.getElementById("stickyNavWrapper");
    if (headerWrapper) {
        headerWrapper.classList.toggle("scrolled", winScroll > 60);
    }

    // Infinite scroll trigger
    if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 250) {
        if (!isFetching && hasMore) {
            loadMoreArticlesFromStore();
        }
    }
}

const backToTopBtn = document.getElementById("backToTopBtn");
if (backToTopBtn) {
    backToTopBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

// ==========================================================================
// THEME CONTROLLER
// ==========================================================================
function initTheme() {
    const themeBtn = document.getElementById("themeToggleBtn");
    if (!themeBtn) return;

    let savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    themeBtn.innerText = savedTheme === "dark" ? "☀️" : "🌙";

    themeBtn.addEventListener("click", () => {
        let currentTheme = document.documentElement.getAttribute("data-theme");
        let newTheme     = currentTheme === "dark" ? "light" : "dark";

        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
        themeBtn.innerText = newTheme === "dark" ? "☀️" : "🌙";
        showToast(`Theme switched to ${newTheme} mode!`, "success");
    });
}

// ==========================================================================
// AUTHENTICATION LOGIC
// ==========================================================================
function checkUserStatus() {
    const user      = localStorage.getItem("user");
    const loggedUser = localStorage.getItem("loggedInUser");
    const isPaid    = localStorage.getItem("paidUser");

    const userLink = document.getElementById("userStatusLink");
    const subBtn   = document.getElementById("subscribeBtn");

    if (user && loggedUser) {
        const parsed = JSON.parse(user);
        if (userLink) userLink.innerText = `Logout (${parsed.name})`;
        if (subBtn) {
            subBtn.innerText = isPaid ? "PREMIUM ACTIVE" : "UPGRADE";
            subBtn.style.backgroundColor = isPaid ? "var(--success)" : "var(--accent-color)";
        }
    } else {
        if (userLink) userLink.innerText = "Login";
        if (subBtn)   subBtn.innerText  = "SUBSCRIBE";
    }
}

function handleAuthAction() {
    const loggedUser = localStorage.getItem("loggedInUser");
    if (loggedUser) {
        localStorage.removeItem("loggedInUser");
        showToast("Logged out successfully.", "success");
        setTimeout(() => { window.location.reload(); }, 1000);
    } else {
        window.location.href = "login.html";
    }
}

const subBtn = document.getElementById("subscribeBtn");
if (subBtn) {
    subBtn.addEventListener("click", () => {
        const loggedUser = localStorage.getItem("loggedInUser");
        if (!loggedUser) {
            showToast("Please login first to subscribe.");
            setTimeout(() => { window.location.href = "login.html"; }, 1000);
            return;
        }
        window.location.href = "payment.html";
    });
}

function updateDateDisplay() {
    const dateEl = document.getElementById("current-date");
    if (!dateEl) return;
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    dateEl.innerText = new Date().toLocaleDateString("en-IN", options);
}

// ==========================================================================
// TOAST NOTIFICATION CONTROLLER
// ==========================================================================
function showToast(message, type = "error") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast-message ${type === "success" ? "success" : ""}`;
    toast.innerHTML = `
        <span class="toast-text">${message}</span>
        <span class="toast-close-btn" onclick="this.parentElement.remove()">×</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==========================================================================
// ★ SEARCH ENGINE — Multi-source with graceful fallback
// ==========================================================================

/**
 * PRIMARY: Google News RSS → rss2json.com (keyword search, no API key)
 * Returns articles in the standard { title, description, url, urlToImage, publishedAt, source } shape.
 */
async function searchViaGoogleNewsRSS(query) {
    // Encode full multi-word query for Google News RSS
    const rssUrl = `${GOOGLE_NEWS_RSS_BASE}?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
    const apiUrl = `${RSS2JSON_API}?rss_url=${encodeURIComponent(rssUrl)}&count=40`;

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 8000);

    try {
        const res = await fetch(apiUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error("rss2json HTTP " + res.status);
        const data = await res.json();

        if (data.status !== "ok" || !data.items || data.items.length === 0) {
            throw new Error("rss2json returned no items");
        }

        // Normalise rss2json items → standard article shape
        return data.items
            .filter(item => item.title && !item.title.includes("[Removed]"))
            .map(item => ({
                title      : item.title,
                description: item.description
                    ? item.description.replace(/<[^>]*>/g, "").slice(0, 280)
                    : "Click to read the full article.",
                url        : item.link || item.guid || "#",
                urlToImage : item.thumbnail || item.enclosure?.link || null,
                publishedAt: item.pubDate,
                source     : { name: item.author || extractSourceFromTitle(item.title) || "Google News" }
            }));
    } catch (err) {
        clearTimeout(timeoutId);
        console.warn("[Search] Google News RSS failed:", err.message);
        return null;   // signal caller to try next source
    }
}

/**
 * SECONDARY: GNews API (keyword search, free tier key required)
 * Skipped automatically if GNEWS_API_KEY is blank.
 */
async function searchViaGNews(query) {
    if (!GNEWS_API_KEY) return null;

    const url = `${GNEWS_BASE}?q=${encodeURIComponent(query)}&lang=en&country=in&max=20&apikey=${GNEWS_API_KEY}`;
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 8000);

    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error("GNews HTTP " + res.status);
        const data = await res.json();

        if (!data.articles || data.articles.length === 0) throw new Error("GNews: no articles");

        return data.articles
            .filter(a => a.title && !a.title.includes("[Removed]"))
            .map(a => ({
                title      : a.title,
                description: a.description || "Click to read the full article.",
                url        : a.url,
                urlToImage : a.image || null,
                publishedAt: a.publishedAt,
                source     : { name: a.source?.name || "GNews" }
            }));
    } catch (err) {
        clearTimeout(timeoutId);
        console.warn("[Search] GNews API failed:", err.message);
        return null;
    }
}

/**
 * TERTIARY: Saurav.tech category mirror (no keyword search — client-side filter)
 * Used when a keyword search is done AND both primary/secondary sources fail.
 */
async function searchViaCategoryFilter(query) {
    const validCategories = ["business","entertainment","general","health","science","sports","technology"];

    // Determine best category from query keywords
    const lq     = query.toLowerCase();
    let category = "general";
    if (/cricket|football|sport|ipl|fifa|game/.test(lq))         category = "sports";
    else if (/tech|ai|artificial|machine|robot|software|app/.test(lq)) category = "technology";
    else if (/business|market|stock|economy|gdp|trade/.test(lq)) category = "business";
    else if (/health|vaccine|medical|hospital|doctor|covid/.test(lq)) category = "health";
    else if (/space|science|nasa|planet|climate|earth/.test(lq)) category = "science";
    else if (/entertainment|bollywood|film|movie|music|celebrity/.test(lq)) category = "entertainment";

    const articles = await fetchCategoryFromSaurav(category);
    if (!articles) return null;

    // Strict client-side relevance filter using the full query
    const keywords = lq.split(/\s+/).filter(w => w.length > 2);
    return articles
        .filter(art => {
            const haystack = `${art.title || ""} ${art.description || ""}`.toLowerCase();
            return keywords.some(kw => haystack.includes(kw));
        })
        .sort((a, b) => {
            // Boost articles whose TITLE matches
            const aTitle = (a.title || "").toLowerCase();
            const bTitle = (b.title || "").toLowerCase();
            const aScore = keywords.filter(kw => aTitle.includes(kw)).length;
            const bScore = keywords.filter(kw => bTitle.includes(kw)).length;
            return bScore - aScore;
        });
}

/**
 * Fetch a category from saurav.tech (used for both browsing and search fallback)
 */
async function fetchCategoryFromSaurav(category = "general") {
    const validCategories = ["business","entertainment","general","health","science","sports","technology"];
    const validCat  = validCategories.includes(category.toLowerCase()) ? category.toLowerCase() : "general";
    const targetUrl = `${SAURAV_API_BASE}${validCat}/in.json`;

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 7000);

    try {
        const res = await fetch(targetUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("saurav.tech HTTP " + res.status);
        const data = await res.json();
        if (data && data.articles && data.articles.length > 0) return data.articles;
        throw new Error("saurav.tech: empty response");
    } catch (err) {
        clearTimeout(timeoutId);
        console.warn("[Category] saurav.tech failed:", err.message);
        return null;
    }
}

/**
 * Master search dispatcher — tries all sources in order
 */
async function fetchSearchResults(query) {
    console.log(`[Search] Query: "${query}"`);

    // 1. Try Google News RSS (best for any keyword, person, place, event)
    let results = await searchViaGoogleNewsRSS(query);
    if (results && results.length > 0) {
        console.log(`[Search] Google News RSS → ${results.length} articles`);
        return { articles: results, source: "Google News" };
    }

    // 2. Try GNews API (only if key is configured)
    results = await searchViaGNews(query);
    if (results && results.length > 0) {
        console.log(`[Search] GNews API → ${results.length} articles`);
        return { articles: results, source: "GNews" };
    }

    // 3. Try category filter on saurav.tech
    results = await searchViaCategoryFilter(query);
    if (results && results.length > 0) {
        console.log(`[Search] Category filter → ${results.length} articles`);
        return { articles: results, source: "Category Filter" };
    }

    // 4. Return backup with clear message
    console.warn("[Search] All sources exhausted — using offline backup");
    return { articles: BACKUP_ARTICLES, source: "offline" };
}

/**
 * Category browsing — saurav.tech with offline fallback
 */
async function fetchNewsFromCategory(category = "general") {
    const articles = await fetchCategoryFromSaurav(category);
    if (articles) return articles;
    return BACKUP_ARTICLES;
}

/** Helper: extract source name from Google News title format "Headline - Source Name" */
function extractSourceFromTitle(title) {
    if (!title) return null;
    const match = title.match(/ - ([^-]+)$/);
    return match ? match[1].trim() : null;
}

// ==========================================================================
// FEED ORCHESTRATION
// ==========================================================================
async function fetchInitialFeed() {
    isFetching    = true;
    displayedCount = 0;
    hasMore       = true;

    const skeleton       = document.getElementById("skeletonContainer");
    const container      = document.getElementById("cards-container");
    const errorContainer = document.getElementById("errorContainer");

    if (skeleton)       skeleton.style.display = "grid";
    if (container)      container.innerHTML    = "";
    if (errorContainer) errorContainer.style.display = "none";

    try {
        let rawArticles;

        if (currentSearchKeyword) {
            // ── SEARCH MODE: use proper keyword search APIs ──────────────────
            const result  = await fetchSearchResults(currentSearchKeyword);
            rawArticles   = result.articles;

            if (result.source === "offline") {
                showNoResultsBanner(currentSearchKeyword, container, skeleton);
                isFetching = false;
                return;
            }
        } else {
            // ── BROWSE MODE: category feed ───────────────────────────────────
            rawArticles = await fetchNewsFromCategory(currentCategory);
        }

        // Sanitise
        fetchedArticlesStore = rawArticles.filter(
            art => art && art.title && !art.title.includes("[Removed]")
        );

        if (skeleton) skeleton.style.display = "none";

        if (fetchedArticlesStore.length === 0) {
            hasMore = false;
            showNoResultsBanner(currentSearchKeyword, container, skeleton);
            isFetching = false;
            return;
        }

        // Render hero + trending only on category browse (not search mode)
        if (!currentSearchKeyword) {
            renderHeroAndTrending(fetchedArticlesStore);
        } else {
            // In search mode, collapse the hero to avoid stale content
            hideHeroSection();
        }

        loadMoreArticlesFromStore();
    } catch (err) {
        if (skeleton) skeleton.style.display = "none";
        showErrorPage("Failed to load news articles. Please check your network connection.");
        console.error("[Feed] Unexpected error:", err);
    } finally {
        isFetching = false;
    }
}

function showNoResultsBanner(query, container, skeleton) {
    if (skeleton) skeleton.style.display = "none";
    if (!container) return;

    const relatedSuggestions = SEARCH_SUGGESTIONS
        .filter(s => s.toLowerCase() !== (query || "").toLowerCase())
        .slice(0, 4);

    container.innerHTML = `
        <div class="search-no-results" style="grid-column: 1/-1;">
            <div class="no-results-icon">🔍</div>
            <h3 class="no-results-title">No news found for "${query || "your search"}"</h3>
            <p class="no-results-subtitle">
                The search returned no results at this time. This may be because the topic is very
                specific, the live news API is temporarily unavailable, or there are no recent articles
                matching your query. Try a different keyword or browse a category.
            </p>
            <div class="no-results-suggestions">
                <p class="suggestions-label">Try these instead:</p>
                <div class="suggestion-pills">
                    ${relatedSuggestions.map(s =>
                        `<button class="suggestion-pill" onclick="selectAndSearch('${s}')">${s}</button>`
                    ).join("")}
                </div>
            </div>
            <button class="btn-retry" onclick="onNavItemClick('general')" style="margin-top: 24px;">
                Browse Top Headlines
            </button>
        </div>
    `;
}

/** Hide the hero & trending section when in search-results mode */
function hideHeroSection() {
    const heroSection    = document.querySelector(".hero-news-section");
    const breakingBar    = document.querySelector(".breaking-news-bar");
    if (heroSection)  heroSection.style.display = "none";
    if (breakingBar)  breakingBar.style.display = "none";
}

/** Restore hero section when returning to browsing mode */
function showHeroSection() {
    const heroSection = document.querySelector(".hero-news-section");
    const breakingBar = document.querySelector(".breaking-news-bar");
    if (heroSection) heroSection.style.display = "";
    if (breakingBar) breakingBar.style.display = "";
}

function loadMoreArticlesFromStore() {
    if (displayedCount >= fetchedArticlesStore.length) {
        hasMore = false;
        return;
    }

    isFetching = true;
    const spinner = document.getElementById("loading");
    if (spinner && displayedCount > 0) spinner.style.display = "flex";

    const nextBatch    = fetchedArticlesStore.slice(displayedCount, displayedCount + ARTICLES_PER_PAGE);
    bindData(nextBatch, displayedCount > 0);
    displayedCount    += nextBatch.length;

    if (displayedCount >= fetchedArticlesStore.length) hasMore = false;
    if (spinner) spinner.style.display = "none";
    isFetching = false;
}

function retryFetchingFeed() {
    fetchInitialFeed();
}

function showErrorPage(msg) {
    const errorContainer = document.getElementById("errorContainer");
    const errorMsg       = document.getElementById("errorMessage");
    const container      = document.getElementById("cards-container");

    if (container)      container.innerHTML   = "";
    if (errorContainer) errorContainer.style.display = "flex";
    if (errorMsg)       errorMsg.innerText   = msg;
}

// ==========================================================================
// HERO & TRENDING RENDERER
// ==========================================================================
function renderHeroAndTrending(articles) {
    if (articles.length === 0) return;

    // 1. Breaking slider
    const slider = document.getElementById("breakingSlider");
    if (slider) {
        slider.innerHTML = "";
        articles.slice(0, 5).forEach(art => {
            const div = document.createElement("div");
            div.className = "breaking-slide";
            div.innerText = art.title;
            div.addEventListener("click", () => handleArticleAccess(art, false));
            slider.appendChild(div);
        });
        initBreakingNewsSliderAnimation();
    }

    // 2. Hero featured main card
    const heroArt   = articles[0];
    const heroImg   = document.getElementById("heroMainImg");
    const heroTitle = document.getElementById("heroMainTitle");
    const heroDesc  = document.getElementById("heroMainDesc");
    const heroMeta  = document.getElementById("heroMainMeta");
    const heroCard  = document.getElementById("heroMainCard");

    if (heroImg)   heroImg.src    = heroArt.urlToImage || "logo.jpg";
    if (heroTitle) heroTitle.innerText = heroArt.title;
    if (heroDesc)  heroDesc.innerText  = heroArt.description || "Read full stories and in-depth reporting.";
    if (heroMeta)  heroMeta.innerText  = `${heroArt.source ? heroArt.source.name : "News Daily"} · ${
        new Date(heroArt.publishedAt || Date.now()).toLocaleDateString("en-IN")
    }`;

    if (heroCard) {
        const newCard = heroCard.cloneNode(true);
        newCard.addEventListener("click", () => handleArticleAccess(heroArt, false));
        heroCard.parentNode.replaceChild(newCard, heroCard);
    }

    // 3. Trending list
    const trendingList = document.getElementById("trendingList");
    if (trendingList && articles.length > 1) {
        trendingList.innerHTML = "";
        articles.slice(1, 6).forEach((art, idx) => {
            const item = document.createElement("div");
            item.className = "trending-item";
            item.innerHTML = `
                <span class="trending-rank">${String(idx + 1).padStart(2, "0")}</span>
                <div class="trending-details">
                    <span class="trending-item-title">${art.title}</span>
                    <span class="trending-item-meta">${art.source ? art.source.name : "News Daily"}</span>
                </div>
            `;
            item.addEventListener("click", () => handleArticleAccess(art, false));
            trendingList.appendChild(item);
        });
    }
}

// ==========================================================================
// CARD RENDERER
// ==========================================================================
function bindData(articles, append = false) {
    const cardsContainer = document.getElementById("cards-container");
    const template       = document.getElementById("template-news-card");
    if (!cardsContainer || !template) return;

    if (!append) cardsContainer.innerHTML = "";

    articles.forEach((article, index) => {
        const clone       = template.content.cloneNode(true);
        const cardElement = clone.querySelector(".news-card");

        const img         = clone.querySelector("#news-img");
        const title       = clone.querySelector("#news-title");
        const desc        = clone.querySelector("#news-desc");
        const source      = clone.querySelector("#news-source");
        const readingTime = clone.querySelector("#reading-time");
        const premiumBadge = clone.querySelector("#premiumBadge");

        img.src    = article.urlToImage || "logo.jpg";
        img.onerror = () => { img.src = "logo.jpg"; };

        title.innerHTML = article.title;
        desc.innerHTML  = article.description || "Click to open full news report.";

        const date = article.publishedAt
            ? new Date(article.publishedAt).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric"
              })
            : "Today";
        source.innerHTML = `${article.source ? article.source.name : "News Daily"} · ${date}`;

        const words   = (article.description || "").split(/\s+/).length
                       + (article.title || "").split(/\s+/).length;
        const timeVal = Math.max(1, Math.ceil(words / 200));
        readingTime.innerText = `${timeVal} min read`;

        const isPremium = index % 3 === 2;
        if (isPremium) premiumBadge.style.display = "inline-block";

        // Like button
        const likeBtn    = clone.querySelector(".like-btn");
        const likesCountEl = clone.querySelector(".likes-counter");
        let initialLikes = likedArticles[article.url] || Math.floor(Math.random() * 40) + 10;
        likedArticles[article.url] = initialLikes;
        likesCountEl.innerText     = initialLikes;

        if (userLikesMap[article.url]) likeBtn.classList.add("liked");

        likeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (userLikesMap[article.url]) {
                likedArticles[article.url]--;
                userLikesMap[article.url] = false;
                likeBtn.classList.remove("liked");
                showToast("Removed like", "success");
            } else {
                likedArticles[article.url]++;
                userLikesMap[article.url] = true;
                likeBtn.classList.add("liked");
                showToast("Liked article!", "success");
            }
            likesCountEl.innerText = likedArticles[article.url];
            localStorage.setItem("newsLikes",    JSON.stringify(likedArticles));
            localStorage.setItem("userLikesMap", JSON.stringify(userLikesMap));
        });

        // Bookmark button
        const bookmarkBtn  = clone.querySelector(".bookmark-btn");
        const isBookmarked = bookmarks.some(item => item.url === article.url);
        if (isBookmarked) bookmarkBtn.classList.add("bookmarked");

        bookmarkBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleBookmark(article, bookmarkBtn);
        });

        // Copy link button
        const copyBtn = clone.querySelector(".copy-btn");
        copyBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(article.url)
                .then(() => showToast("Copied link to clipboard!", "success"))
                .catch(() => showToast("Failed to copy link."));
        });

        // Share button
        const shareBtn = clone.querySelector(".share-btn");
        shareBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (navigator.share) {
                navigator.share({ title: article.title, url: article.url }).catch(() => {});
            } else {
                showToast("Link copied to clipboard!", "success");
                navigator.clipboard.writeText(article.url);
            }
        });

        // Card click → open article
        cardElement.addEventListener("click", () => {
            handleArticleAccess(article, isPremium);
        });

        cardsContainer.appendChild(clone);
    });
}

function handleArticleAccess(article, isPremium) {
    const loggedUser = localStorage.getItem("loggedInUser");
    const isPaid     = localStorage.getItem("paidUser");

    if (isPremium) {
        if (!loggedUser) {
            showToast("This is a Premium Article. Please login first to view.");
            setTimeout(() => { window.location.href = "login.html"; }, 1500);
            return;
        }
        if (!isPaid) {
            localStorage.setItem("pendingArticle", article.url);
            showToast("This article requires a Premium Subscription plan.");
            setTimeout(() => { window.location.href = "payment.html"; }, 1500);
            return;
        }
    }

    window.open(article.url, "_blank");
}

// ==========================================================================
// BOOKMARKS SYSTEM
// ==========================================================================
function toggleBookmark(article, btn) {
    const index = bookmarks.findIndex(item => item.url === article.url);
    if (index > -1) {
        bookmarks.splice(index, 1);
        btn.classList.remove("bookmarked");
        showToast("Bookmark removed.", "success");
    } else {
        bookmarks.push({
            title : article.title,
            url   : article.url,
            source: article.source ? article.source.name : "News Daily"
        });
        btn.classList.add("bookmarked");
        showToast("Added to bookmarks!", "success");
    }
    localStorage.setItem("newsBookmarks", JSON.stringify(bookmarks));
    updateBookmarksBadge();
    renderBookmarksList();
}

function updateBookmarksBadge() {
    const badge = document.getElementById("bookmarksCount");
    if (badge) badge.innerText = bookmarks.length;
}

function renderBookmarksList() {
    const list = document.getElementById("bookmarksList");
    if (!list) return;

    if (bookmarks.length === 0) {
        list.innerHTML = `<li class="bookmark-empty">No bookmarked articles yet</li>`;
        return;
    }

    list.innerHTML = bookmarks.map(item => `
        <li class="bookmark-item" onclick="window.open('${item.url}', '_blank')">
            <span class="bookmark-item-title">${item.title}</span>
            <span class="bookmark-item-meta">${item.source}</span>
        </li>
    `).join("");
}

// ==========================================================================
// BREAKING NEWS SLIDER ANIMATION
// ==========================================================================
let currentSlideIndex = 0;
function initBreakingNewsSliderAnimation() {
    const slides = document.querySelectorAll(".breaking-slide");
    if (slides.length <= 1) return;

    setInterval(() => {
        slides[currentSlideIndex].style.transform = `translateY(-100%)`;
        currentSlideIndex = (currentSlideIndex + 1) % slides.length;
        slides[currentSlideIndex].style.transform = `translateY(0%)`;
    }, 4000);
}

// ==========================================================================
// SEARCH BAR — UI & Event Handling
// ==========================================================================
const searchIcon     = document.getElementById("search-icon");
const searchOverlay  = document.getElementById("searchOverlay");
const searchInput    = document.getElementById("searchText");
const searchButton   = document.getElementById("searchButton");
const suggestionsBox = document.getElementById("suggestionsBox");

// Update placeholder to reflect improved capabilities
if (searchInput) {
    searchInput.placeholder = "Search news, topics, people, or places…";
}

if (searchIcon && searchOverlay) {
    searchIcon.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = searchOverlay.style.display === "flex";
        searchOverlay.style.display = isOpen ? "none" : "flex";
        if (!isOpen && searchInput) searchInput.focus();
    });
}

if (searchInput) {
    searchInput.addEventListener("input", () => {
        const val = searchInput.value.trim();
        if (!val || !suggestionsBox) {
            if (suggestionsBox) suggestionsBox.style.display = "none";
            return;
        }

        const filtered = SEARCH_SUGGESTIONS.filter(
            item => item.toLowerCase().includes(val.toLowerCase())
        );

        if (filtered.length > 0) {
            suggestionsBox.innerHTML = filtered.map(item => `
                <div class="suggestion-item" onclick="selectSuggestion('${item.replace(/'/g, "\\'")}')">${item}</div>
            `).join("");
            suggestionsBox.style.display = "flex";
        } else {
            suggestionsBox.style.display = "none";
        }
    });

    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            triggerSearch();
        }
    });
}

if (searchButton) {
    searchButton.addEventListener("click", () => triggerSearch());
}

function selectSuggestion(val) {
    if (searchInput) {
        searchInput.value = val;
        if (suggestionsBox) suggestionsBox.style.display = "none";
        triggerSearch();
    }
}

// Public helper used by the "no results" suggestion pills
function selectAndSearch(val) {
    if (searchInput) searchInput.value = val;
    if (searchOverlay) searchOverlay.style.display = "flex";
    triggerSearch();
}

function triggerSearch() {
    if (!searchInput) return;
    const query = searchInput.value.trim();

    if (!query) {
        showToast("Please enter a search keyword.");
        return;
    }

    // Block clearly non-news queries
    const blockedPatterns = /buy|shop|price|discount|amazon|flipkart|cart|order|delivery|product/i;
    if (blockedPatterns.test(query)) {
        showToast("This portal shows news only. Please search for news topics, people, or events.");
        return;
    }

    currentSearchKeyword = query;
    if (searchOverlay) searchOverlay.style.display = "none";
    if (suggestionsBox) suggestionsBox.style.display = "none";

    const catTitle = document.getElementById("feedCategoryTitle");
    if (catTitle) catTitle.innerText = `Search results for "${query}"`;

    // Show a loading indicator in the feed title area
    showSearchLoadingState(query);
    fetchInitialFeed();
}

function showSearchLoadingState(query) {
    const container = document.getElementById("cards-container");
    if (container) {
        container.innerHTML = `
            <div style="grid-column:1/-1; display:flex; flex-direction:column; align-items:center;
                        justify-content:center; padding:60px 20px; gap:16px; color:var(--text-muted);">
                <div class="loading-spinner" style="display:block;"></div>
                <p style="font-size:0.95rem;">Searching for "<strong style="color:var(--text-primary)">${query}</strong>"…</p>
            </div>
        `;
    }
}

// ==========================================================================
// NAVIGATION & CATEGORIES CONTROLLER
// ==========================================================================
function onNavItemClick(id) {
    currentCategory      = id;
    currentSearchKeyword = "";  // reset search on category click
    if (searchInput) searchInput.value = "";

    // Restore hero section
    showHeroSection();

    const links = document.querySelectorAll(".nav-item-link");
    links.forEach(link => {
        const hasId = link.getAttribute("onclick") &&
                      link.getAttribute("onclick").includes(`'${id}'`);
        link.classList.toggle("active", hasId);
    });

    const mega = document.getElementById("megaMenu");
    if (mega) mega.style.display = "none";

    const catTitle = document.getElementById("feedCategoryTitle");
    if (catTitle) catTitle.innerText = `${id.toUpperCase()} Headlines`;

    fetchInitialFeed();
}

const menuIcon = document.getElementById("menuIcon");
const megaMenu = document.getElementById("megaMenu");

if (menuIcon && megaMenu) {
    menuIcon.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = megaMenu.style.display === "flex";
        megaMenu.style.display = isOpen ? "none" : "flex";
    });
}

const bookmarksBtn   = document.getElementById("bookmarksBtn");
const bookmarksPanel = document.getElementById("bookmarksPanel");

if (bookmarksBtn && bookmarksPanel) {
    bookmarksBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = bookmarksPanel.style.display === "flex";
        bookmarksPanel.style.display = isOpen ? "none" : "flex";
    });
}

function handleSubscribeAlert() {
    showToast("Premium monthly plans start at just ₹99/mo. Click SUBSCRIBE to proceed!", "success");
}

function handleEpaperClick() {
    showToast("e-Paper digital subscriptions are available for paid users.", "success");
}

function showPrivacyAlert() {
    showToast("Privacy Policy: Credentials are encrypted locally.", "success");
}

function showTermsAlert() {
    showToast("Terms: News Daily syndicates verified content references.", "success");
}

function handleNewsletterSubmit(e) {
    e.preventDefault();
    const email = document.getElementById("newsletterEmail").value;
    showToast(`Morning Brief newsletters will be sent to ${email}.`, "success");
    document.getElementById("footerNewsletterForm").reset();
}

function handleOuterClickEvents(e) {
    if (megaMenu && !megaMenu.contains(e.target) && e.target !== menuIcon) {
        megaMenu.style.display = "none";
    }
    if (bookmarksPanel && !bookmarksPanel.contains(e.target) && e.target !== bookmarksBtn) {
        bookmarksPanel.style.display = "none";
    }
    if (searchOverlay && !searchOverlay.contains(e.target) && e.target !== searchIcon) {
        searchOverlay.style.display = "none";
    }
}