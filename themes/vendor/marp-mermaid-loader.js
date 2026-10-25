(() => {
    // CDNのURLをローカルの相対パスに変更
    const MERMAID_URL = '../themes/vendor/mermaid.min.js';
    // 処理済みのブロックを再処理しないようセレクタを調整（Marp CLIのmarp-preおよび通常のpreの両方に対応）
    const SELECTOR = ':is(pre, marp-pre):not([data-mermaid-processed]) > code.language-mermaid:not([data-mermaid-failed])';
    let running = false, pending = false, initialized = false, observer = null;

    function loadMermaid() {
        if (window.mermaid) return Promise.resolve(window.mermaid);
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = MERMAID_URL; // ← 変数名を変更した場合はここも合わせます
            s.onload = () => resolve(window.mermaid);
            s.onerror = () => reject(new Error('mermaid load failed: ' + MERMAID_URL));
            document.head.appendChild(s);
        });
    }

    function normalizeSvgSize(container) {
        const svg = container.querySelector('svg');
        if (!svg) return;

        // viewBox が無ければ getBBox から作る
        let vb = svg.getAttribute('viewBox');
        if (!vb) {
            const b = svg.getBBox();
            vb = `${b.x} ${b.y} ${b.width} ${b.height}`;
            svg.setAttribute('viewBox', vb);
        }
        const [, , vw, vh] = vb.split(/[\s,]+/).map(Number);
        if (!vw || !vh) return;

        // 自然サイズ（＝縦横比）を確定させる
        svg.setAttribute('width', vw);
        svg.setAttribute('height', vh);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        // mermaid が付けるインラインスタイルを除去（CSS 側の制御に委ねる）
        svg.style.removeProperty('max-width');
        svg.style.removeProperty('width');
        svg.style.removeProperty('height');
    }

    async function render() {
        if (running) { pending = true; return; }
        if (document.querySelectorAll(SELECTOR).length === 0) return;
        running = true;
        if (observer) observer.disconnect();

        try {
            const mermaid = await loadMermaid();
            if (!initialized) {
                mermaid.initialize({
                startOnLoad: false,
                theme: 'neutral',
                securityLevel: 'strict',
                fontFamily: "'Meiryo','BIZ UDGothic','Yu Gothic','IPAPGothic','IPAGothic','DejaVu Sans',sans-serif",
                fontSize: 14,
                flowchart:     { useMaxWidth: false, htmlLabels: false },
                sequence:      { useMaxWidth: false },
                class:         { useMaxWidth: false, htmlLabels: false },
                state:         { useMaxWidth: false },
                er:            { useMaxWidth: false },
                gantt:         { useMaxWidth: false },
                journey:       { useMaxWidth: false },
                pie:           { useMaxWidth: false },
                gitGraph:      { useMaxWidth: false },
                requirement:   { useMaxWidth: false },
                mindmap:       { useMaxWidth: false },
                timeline:      { useMaxWidth: false },
                quadrantChart: { useMaxWidth: false },
                xyChart:       { useMaxWidth: false },
                sankey:        { useMaxWidth: false },
                block:         { useMaxWidth: false },
                packet:        { useMaxWidth: false },
                architecture:  { useMaxWidth: false }
            });
                initialized = true;
            }

            // 【Step 1】スケーリングの影響を受けない「作業場」をbody直下に作成
            let workspace = document.getElementById('mermaid-workspace');
            if (!workspace) {
                workspace = document.createElement('div');
                workspace.id = 'mermaid-workspace';
                // 画面外に配置（display:noneだとgetBBoxが0になるためvisibilityを使用）
                workspace.style.position = 'absolute';
                workspace.style.top = '-9999px';
                workspace.style.left = '0';
                workspace.style.visibility = 'hidden';
                workspace.style.width = '880px'; 
                document.body.appendChild(workspace);
            }

            for (const code of Array.from(document.querySelectorAll(SELECTOR))) {
                const pre = code.parentElement;
                
                // 元のpreを非表示にして保持（DOM同期対策）
                pre.setAttribute('data-mermaid-processed', 'true');
                pre.style.display = 'none';

                // スライド内ではなく、安全な「作業場」にdivを作成
                const div = document.createElement('div');
                div.className = 'mermaid';
                div.textContent = code.textContent;
                workspace.appendChild(div);

                try {
                    // 【Step 2】作業場内でMermaidに計算(getBBox)と描画を行わせる
                    await mermaid.run({ nodes: [div] });
                    normalizeSvgSize(div); 
                    // 完成した正しい比率のSVG（divごと）を作業場からスライド内の正しい位置へ移動
                    pre.parentNode.insertBefore(div, pre.nextSibling);

                } catch (e) {
                    console.error('[mermaid] 描画/構文エラー:', e);
                    code.setAttribute('data-mermaid-failed', '');
                    div.remove();
                    pre.style.display = ''; // エラー時は元に戻す
                }
            }
            document.body.setAttribute('data-mermaid-done', '');
        } catch (e) {
            console.error('[mermaid] ライブラリ未ロード。コードブロックはそのまま残します。', e);
        } finally {
            running = false;
            if (observer) observer.observe(document.body, { childList: true, subtree: true });
            if (pending) { pending = false; setTimeout(render, 300); }
        }
    }

    let t;
    observer = new MutationObserver(() => { clearTimeout(t); t = setTimeout(render, 300); });
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    } else {
        render();
    }
    observer.observe(document.body, { childList: true, subtree: true });
})();