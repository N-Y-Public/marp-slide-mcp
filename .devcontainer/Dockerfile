FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

ENV DEBIAN_FRONTEND=noninteractive

# ロケール設定（日本語環境対応）
RUN apt-get update && apt-get install -y --no-install-recommends \
    locales \
    && localedef -i ja_JP -c -f UTF-8 -A /usr/share/locale/locale.alias ja_JP.UTF-8 \
    && echo "ja_JP.UTF-8 UTF-8" >> /etc/locale.gen \
    && locale-gen \
    && update-locale LANG=ja_JP.UTF-8

# Headless Chromium / Puppeteer 実行用共有ライブラリ、日本語フォント、ユーティリティのインストール
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    wget \
    gnupg \
    procps \
    git \
    xdg-utils \
    # Headless Chromium 本体
    chromium \
    # Headless Chromium & Puppeteer 実行時共有ライブラリ
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxkbcommon0 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    # 日本語フォント・CJKフォント（スライド描画・文字化け防止）
    fonts-noto-cjk \
    fonts-noto-cjk-extra \
    fonts-ipafont \
    fonts-ipafont-gothic \
    fonts-ipafont-mincho \
    fonts-vlgothic \
    fonts-liberation \
    && ln -sf /usr/bin/chromium /usr/local/bin/google-chrome \
    && ln -sf /usr/bin/chromium /usr/local/bin/chrome \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 環境変数設定
ENV LANG=ja_JP.UTF-8 \
    LC_ALL=ja_JP.UTF-8 \
    CHROME_PATH=/usr/bin/chromium \
    CHROME_NO_SANDBOX=1 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false \
    PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox"

# 一般ユーザーに切り替え
USER node
