const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const APP_URL = process.env.DEMO_URL || 'http://localhost:5173';
const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'docs', 'assets');
const videoDir = path.join(outputDir, '.demo-video-tmp');
const outputPath = path.join(outputDir, 'nexus-platform-demo.webm');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function addCaption(page, text) {
  await page.evaluate((captionText) => {
    let caption = document.querySelector('#nexus-demo-caption');
    if (!caption) {
      caption = document.createElement('div');
      caption.id = 'nexus-demo-caption';
      caption.style.position = 'fixed';
      caption.style.left = '50%';
      caption.style.bottom = '28px';
      caption.style.transform = 'translateX(-50%)';
      caption.style.zIndex = '2147483647';
      caption.style.maxWidth = '820px';
      caption.style.padding = '16px 22px';
      caption.style.borderRadius = '8px';
      caption.style.background = 'rgba(15, 23, 42, 0.92)';
      caption.style.color = '#fff';
      caption.style.font = '600 18px/1.35 Inter, system-ui, sans-serif';
      caption.style.textAlign = 'center';
      caption.style.boxShadow = '0 18px 45px rgba(0, 0, 0, 0.26)';
      caption.style.pointerEvents = 'none';
      caption.style.transition = 'opacity 180ms ease, transform 180ms ease';
      document.body.appendChild(caption);
    }
    caption.textContent = captionText;
    caption.style.opacity = '1';
  }, text);
  await wait(1900);
}

async function clickIfVisible(locator, timeout = 3500) {
  try {
    await locator.first().waitFor({ state: 'visible', timeout });
    await locator.first().click();
    return true;
  } catch {
    return false;
  }
}

async function pauseForFeature(page, caption, ms = 2200) {
  await addCaption(page, caption);
  await wait(ms);
}

async function closeModalIfOpen(page) {
  const curationClose = page.getByLabel(/Close curation modal/i).first();
  const genericModalClose = page.locator('.modal-content .close-btn').first();
  const backdrop = page.locator('.modal-backdrop').first();
  if (await clickIfVisible(curationClose, 1000)) {
    await wait(400);
    return;
  }
  if (await clickIfVisible(genericModalClose, 1000)) {
    await wait(400);
    return;
  }
  try {
    await backdrop.click({ force: true, timeout: 1000 });
    await wait(400);
  } catch {
    await page.keyboard.press('Escape').catch(() => {});
  }
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.rmSync(videoDir, { recursive: true, force: true });
  fs.mkdirSync(videoDir, { recursive: true });
  fs.rmSync(outputPath, { force: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: videoDir,
      size: { width: 1440, height: 900 },
    },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(9000);

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await pauseForFeature(page, 'Nexus Research Intelligence Platform: a live discovery feed for peer-reviewed research, powered by Supabase and the backend API.');

  await page.mouse.wheel(0, 520);
  await wait(900);
  await pauseForFeature(page, 'The home feed presents editorial research cards with discipline chips, citation counts, evidence labels, quick citation, saving, and narration actions.');

  await page.mouse.wheel(0, -520);
  await wait(700);
  const searchInput = page.locator('input.search-input');
  await searchInput.fill('machine learning');
  await wait(1000);
  await pauseForFeature(page, 'Curated search filters instantly across title, summary, author, journal, and tags.');

  await page.getByLabel('Clear search query').click().catch(async () => {
    await searchInput.fill('');
  });
  await wait(500);

  await page.getByRole('button', { name: /Global Scholarly Index/i }).first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await searchInput.fill('climate resilience');
  await wait(3500);
  await pauseForFeature(page, 'Global Search expands discovery across the scholarly index, with live results ready for just-in-time AI synthesis.');

  await page.locator('#year-select').selectOption({ label: 'Recent (2023-2026)' }).catch(async () => {
    await page.locator('#year-select').selectOption({ index: 1 }).catch(() => {});
  });
  await page.locator('#sort-select').selectOption({ label: 'Most Recent' }).catch(() => {});
  await page.getByLabel(/Free PDF Only/i).check().catch(() => {});
  await wait(1800);
  await pauseForFeature(page, 'Readers can refine by publication window, relevance, citation impact, recency, and open-access availability.');

  await page.getByRole('button', { name: /^Discover$/i }).click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await searchInput.fill('');
  await page.getByLabel(/Free PDF Only/i).uncheck().catch(() => {});
  await page.getByRole('button', { name: /^All Fields$/i }).click().catch(() => {});
  await page.locator('.research-card').first().waitFor({ state: 'visible', timeout: 9000 });
  await wait(800);
  await clickIfVisible(page.locator('.research-card').first());
  await page.locator('.article-view').waitFor({ state: 'visible', timeout: 9000 });
  await wait(1200);
  await pauseForFeature(page, 'Opening a card reveals the complete paper workspace: metadata, DOI, citations, evidence confidence, quick cite, translation, and synthesis.');

  await clickIfVisible(page.getByLabel('Play audio narration'), 5000);
  await wait(2400);
  await pauseForFeature(page, 'Audio narration starts directly from the article. Nexus uses studio audio when available, with browser voice fallback for instant summaries.');

  await clickIfVisible(page.getByRole('button', { name: /1\.25x/i }), 3000);
  await wait(900);
  await pauseForFeature(page, 'The narration controls include timeline progress and adjustable playback speed for focused listening.');

  await clickIfVisible(page.getByRole('button', { name: /Real-World Impact/i }), 5000);
  await wait(900);
  await pauseForFeature(page, 'The Real-World Impact tab separates practical applications, policy implications, and cross-discipline utility.');

  await clickIfVisible(page.getByRole('button', { name: /Methodology & Limits/i }), 5000);
  await wait(900);
  await pauseForFeature(page, 'The methodology view makes the study design, confidence level, and limitations explicit, keeping the synthesis grounded.');

  await clickIfVisible(page.getByRole('button', { name: /Ask the Paper/i }), 5000);
  await page.locator('.paper-chat-container').waitFor({ state: 'visible', timeout: 9000 });
  await wait(900);
  await pauseForFeature(page, 'Ask the Paper is a grounded chatbot for questions about methodology, findings, limitations, and real-world use.');

  await clickIfVisible(page.getByRole('button', { name: /Core Methodology/i }), 5000);
  await page.locator('.chat-message-row.user-row').last().waitFor({ state: 'visible', timeout: 9000 }).catch(() => {});
  await page.locator('.chat-message-row.assistant-row').last().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  await wait(2200);
  await pauseForFeature(page, 'Here the chatbot answers a methodology question using the paper abstract, synthesis, and metrics instead of drifting into generic claims.');

  await page.locator('.chat-text-input').fill('What is the main limitation I should remember before applying this?');
  await page.getByRole('button', { name: /^Ask$/i }).click().catch(async () => {
    await page.keyboard.press('Enter');
  });
  await wait(3600);
  await pauseForFeature(page, 'Users can continue the conversation with custom follow-up questions and copy useful answers.');

  await clickIfVisible(page.getByRole('button', { name: /Plain Synthesis/i }), 5000);
  await wait(700);
  await page.mouse.wheel(0, -680);
  await wait(700);

  await page.getByRole('button', { name: /Back to Feed/i }).click().catch(async () => {
    await page.keyboard.press('Escape');
  });
  await wait(1000);

  await clickIfVisible(page.getByRole('button', { name: /Listen|Playing/i }));
  await wait(1600);
  await pauseForFeature(page, 'The persistent global audio player keeps narration available while moving through the feed and other tools.');

  await clickIfVisible(page.getByRole('button', { name: /Disciplines/i }));
  await wait(700);
  await pauseForFeature(page, 'Back in the wider workspace, discipline controls focus the feed across AI, medicine, climate, psychology, physics, and more.');
  await closeModalIfOpen(page);
  await wait(600);

  await clickIfVisible(page.getByRole('button', { name: /Save/i }));
  await wait(700);
  await page.getByRole('button', { name: /Saved/i }).click();
  await wait(1000);
  await pauseForFeature(page, 'Saved papers collect into a lightweight personal library for later reading and export workflows.');

  await page.getByRole('button', { name: /^Discover$/i }).click();
  await wait(700);
  await clickIfVisible(page.getByRole('button', { name: /Submit DOI/i }));
  await wait(900);
  await pauseForFeature(page, 'Authenticated researchers can submit a DOI and run it through ingestion, AI synthesis, audio generation, and persistent storage.');
  await closeModalIfOpen(page);
  await wait(600);

  await clickIfVisible(page.getByRole('button', { name: /Dark/i }));
  await wait(900);
  await pauseForFeature(page, 'Theme controls, keyboard shortcuts, account tools, and Supabase-backed personalization round out the research workspace.');

  await page.evaluate(() => {
    const caption = document.querySelector('#nexus-demo-caption');
    if (caption) {
      caption.textContent = 'Nexus: discovery, AI synthesis, grounded paper chat, narration, saving, citation, and JIT ingestion in one research platform.';
    }
  });
  await wait(2600);

  const video = page.video();
  await context.close();
  await browser.close();

  const recordedPath = await video.path();
  fs.copyFileSync(recordedPath, outputPath);
  fs.rmSync(videoDir, { recursive: true, force: true });
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
