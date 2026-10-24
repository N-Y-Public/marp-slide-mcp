// Marp CoreライブラリからMarpクラスをインポートします（スライド変換エンジンの本体）
import { Marp } from '@marp-team/marp-core';

// 設定オブジェクトをデフォルトエクスポートします
export default {
  // Marpの基本オプション定義
  options: {
    // スライド内のHTMLタグの直接記述を許可します
    html: true,
  },
  // カスタムエンジンの初期化関数を定義します
  engine: function(opts) {
    // HTMLタグの許可オプションをエンジンオプションにも明示的に設定します
    opts.html = true;
    // カスタムオプションを適用したMarpインスタンスを新規作成します
    const marp = new Marp(opts);
    
    // カスタムエンジンのロード開始ログを出力します
    console.warn("--- Loading Custom Marp Engine (Instance) ---");
    
    // Markdown-itのプラグインを登録してMarpの変換処理を拡張します
    marp.use((md) => {
      // 1. 目次（TOC）スライドの自動生成ルールをディレクティブ解析直後（SVGラッパーや属性適用より前）に追加します
      md.core.ruler.after('marpit_directives_parse', 'marp_toc', (state) => {
        // インラインモード（ヘッダー・フッター内部のパース時など）の場合は処理をスキップします
        if (state.inlineMode) return;
        // パース対象の全トークン配列を取得します
        const tokens = state.tokens;
        // 目次スライドの開始位置インデックスを初期化します
        let tocStartIndex = -1;
        // 目次スライドの終了位置インデックスを初期化します
        let tocEndIndex = -1;
        // 現在処理中のスライドが目次スライドかどうかを判定するフラグです
        let isTocSlide = false;
        
        // 各スライドのタイトルとページ番号を格納する配列です
        const headings = [];
        // 現在のスライドページ番号を保持するカウンターです
        let currentSlide = 0;
        
        // トークン配列を先頭から走査して見出し情報と目次スライドを検出します
        for (let i = 0; i < tokens.length; i++) {
          // 現在のトークンを取得します
          const token = tokens[i];
          
          // スライドの開始タグ（section open）を検出した場合
          if (token.type === 'marpit_slide_open') {
            // スライド番号をインクリメントします（メタ情報があればそれを基準にします）
            currentSlide = token.meta && token.meta.marpitSlide !== undefined ? token.meta.marpitSlide + 1 : currentSlide + 1;
            
            // スライドに指定されたディレクティブ属性を取得します
            const directives = token.meta && token.meta.marpitDirectives ? token.meta.marpitDirectives : {};
            // スライドに付与されたクラス名を取得します
            const classStr = directives.class || '';
            
            // クラス名に 'toc' が含まれる場合は目次スライドとしてマークします
            if (classStr.split(' ').includes('toc')) {
              // 最初の目次スライドの位置を記録します
              if (tocStartIndex === -1) {
                // 開始位置を保存します
                tocStartIndex = i;
                // 目次スライド処理中フラグを立てます
                isTocSlide = true;
              }
            }
          }
          
          // スライドの終了タグ（section close）を検出した場合
          if (token.type === 'marpit_slide_close') {
            // 目次スライドの終了であれば終了位置を記録します
            if (isTocSlide) {
              // 終了インデックスを保存します
              tocEndIndex = i;
              // フラグをリセットします
              isTocSlide = false;
            }
          }
          
          // 目次スライド以外のページで h1 見出し（ページタイトル）を検出した場合
          if (!isTocSlide && token.type === 'heading_open' && token.tag === 'h1') {
            // タイトル文字列を保持する変数を初期化します
            let title = '';
            // 見出しタグ内のインラインテキストを探します
            for (let j = i + 1; j < tokens.length; j++) {
              // インライン要素を発見した場合
              if (tokens[j].type === 'inline') {
                // テキストコンテンツを取得します
                title = tokens[j].content;
                // 走査を終了します
                break;
              // 見出し終了タグに到達した場合は走査を打ち切ります
              } else if (tokens[j].type === 'heading_close') {
                // ループを抜けます
                break;
              }
            }
            
            // アンカー見出し（ページタイトル・タイトル等）の場合は、直後の段落から実際の表題を取得します
            for (let j = i + 1; j < tokens.length; j++) {
              // 次のスライド開始タグまたは別の見出し開始タグに到達した場合は探索を打ち切ります
              if (tokens[j].type === 'marpit_slide_open' || tokens[j].type === 'heading_open') break;
              // 段落の開始タグを検出した場合
              if (tokens[j].type === 'paragraph_open') {
                // 段落内のインライン要素トークンを取得します
                const inlineToken = tokens[j + 1];
                // インライン要素が存在し、内容の文字列を持つ場合
                if (inlineToken && inlineToken.type === 'inline' && inlineToken.content) {
                  // 改行タグ（<br>）を空白に置換して整形したタイトル文字列を生成します
                  const paraTitle = inlineToken.content.replace(/<br\s*\/?>/gi, ' ').trim();
                  // タイトル文字列が空でない場合
                  if (paraTitle) {
                    // スライドタイトルとして採用します
                    title = paraTitle;
                  }
                  // 段落からの取得が完了したためループを抜けます
                  break;
                }
              }
            }

            // 表紙（1ページ目）は除外し、タイトルが取得でき、かつ未登録のページであれば目次リストに追加します
            if (currentSlide > 1 && title && !headings.find(h => h.page === currentSlide)) {
              // タイトルとページ番号のペアを保存します
              headings.push({ title, page: currentSlide });
            }
          }
        }
        
        // 目次スライドが存在し、かつ見出しが1件以上収集できている場合に目次を構築します
        if (tocStartIndex !== -1 && tocEndIndex !== -1 && headings.length > 0) {
          // 元の目次スライドに含まれるヘッダー・フッタートークン（ロゴ画像等）を抽出して保持する配列です
          const preservedTokens = [];
          // 元の目次スライドに含まれるh6フッタートークン（コピーライト・機密指定）を保持する配列です
          const preservedFooterH6Tokens = [];
          // 目次スライド内のトークンを走査します
          for (let k = tocStartIndex + 1; k < tocEndIndex; k++) {
            // ヘッダーまたはフッターの開始タグを検出した場合
            if (tokens[k].type === 'marpit_header_open' || tokens[k].type === 'marpit_footer_open') {
              // 対応する終了タグのタイプを判定します
              const closeType = tokens[k].type === 'marpit_header_open' ? 'marpit_header_close' : 'marpit_footer_close';
              // 終了タグに到達するまでトークンを走査・保存します
              while (k < tocEndIndex) {
                // トークンを保存配列に追加します
                preservedTokens.push(tokens[k]);
                // 終了タグに到達した場合はループを抜けます
                if (tokens[k].type === closeType) break;
                // インデックスを進めます
                k++;
              }
            // h6見出し（コピーライト・機密指定アンカー）の開始タグを検出した場合
            } else if (tokens[k].type === 'heading_open' && tokens[k].tag === 'h6') {
              // h6見出し終了タグおよび直後の段落終了タグまでを一塊として保存します
              while (k < tocEndIndex) {
                // トークンをh6フッター保存配列に追加します
                preservedFooterH6Tokens.push(tokens[k]);
                // 直後の段落終了タグ（paragraph_close）に到達したら1組の抽出を完了します
                if (tokens[k].type === 'paragraph_close') break;
                // インデックスを進めます
                k++;
              }
            }
          }

          // トークンを正しく複製するためのヘルパー関数を定義します
          const cloneToken = (t) => {
            // 同一タイプ・タグ・ネストレベルでトークンを新規インスタンス化します
            const clone = new state.Token(t.type, t.tag, t.nesting);
            // 元トークンのプロパティを浅いコピーで複製します
            Object.assign(clone, t);
            // 属性配列が存在する場合
            if (t.attrs) {
              // 属性配列を深く複製します
              clone.attrs = t.attrs.map(attr => [...attr]);
            }
            // 子要素トークン配列が存在する場合
            if (t.children) {
              // 再帰的に子要素トークンを複製します
              clone.children = t.children.map(cloneToken);
            }
            // 複製したトークンを返却します
            return clone;
          };

          // 1スライドあたりに収める目次項目数を定義します（あふれ防止）
          const ITEMS_PER_SLIDE = 12;
          // 目次項目をスライドごとに分割した配列です
          const chunks = [];
          // 見出しリストを上限件数ごとに分割します
          for (let i = 0; i < headings.length; i += ITEMS_PER_SLIDE) {
            // 12件ごとにスライスしてチャンクに追加します
            chunks.push(headings.slice(i, i + ITEMS_PER_SLIDE));
          }
          
          // 目次によって生成される総スライド数を取得します
          const totalAddedSlides = chunks.length;
          // 元の目次スライド開始トークンを退避します
          const origTocOpen = tokens[tocStartIndex];
          // 元の目次スライド終了トークンを退避します
          const origTocClose = tokens[tocEndIndex];
          // 元の目次スライドの0始まりスライドインデックスを取得します
          const baseSlideIndex = origTocOpen.meta && origTocOpen.meta.marpitSlide !== undefined ? origTocOpen.meta.marpitSlide : 1;
          // 元のデッキ全体の総スライド数を取得します
          const baseSlideTotal = origTocOpen.meta && origTocOpen.meta.marpitSlideTotal !== undefined ? origTocOpen.meta.marpitSlideTotal : 1;
          // 新しく挿入するトークンを保持する配列です
          const newTokens = [];
          
          // 分割したチャンクごとに目次スライド用トークンを組み立てます
          chunks.forEach((chunk, chunkIndex) => {
            // この目次チャンクの0始まりスライドインデックスを算出します
            const currentSlideIndex = baseSlideIndex + chunkIndex;
            // 目次分割後の新しい総スライド数を算出します
            const updatedSlideTotal = baseSlideTotal + (totalAddedSlides - 1);
            // 新しいスライド開始トークンを生成します
            const slideOpen = new state.Token('marpit_slide_open', 'section', 1);
            // ブロック要素としてマークします
            slideOpen.block = true;
            // 元の目次スライドの属性配列をディープコピーして引き継ぎます
            slideOpen.attrs = origTocOpen.attrs ? origTocOpen.attrs.map(attr => [...attr]) : [];
            // スライドのアンカーID属性をページ番号（1始まり）に設定します
            slideOpen.attrSet('id', String(currentSlideIndex + 1));
            // 元のソースマップ情報を引き継ぎます
            slideOpen.map = origTocOpen.map ? [...origTocOpen.map] : [0, 1];
            // メタデータをディープコピーして引き継ぎます
            slideOpen.meta = origTocOpen.meta ? JSON.parse(JSON.stringify(origTocOpen.meta)) : {};
            // チャンク番号に応じて0始まりスライドインデックスを設定します
            slideOpen.meta.marpitSlide = currentSlideIndex;
            // 全体ページ総数に追加スライド数を反映します
            slideOpen.meta.marpitSlideTotal = updatedSlideTotal;
            // Marpitのinline_svgおよびcollectプラグインが独立スライド開始と認識するフラグを設定します
            slideOpen.meta.marpitSlideElement = 1;
            // トークン配列に追加します
            newTokens.push(slideOpen);

            // 元スライドのヘッダー・フッタートークンが存在する場合は注入します
            preservedTokens.forEach(t => {
              // 複製したトークンを新規トークン列に追加します
              newTokens.push(cloneToken(t));
            });
            
            // 目次タイトル用 h1 タグの開始トークンを作成します
            const h1Open = new state.Token('heading_open', 'h1', 1);
            // ブロック要素としてマークします
            h1Open.block = true;
            // トークン配列に追加します
            newTokens.push(h1Open);
            
            // h1 内のインライン要素を作成します
            const h1Inline = new state.Token('inline', '', 0);
            // テキスト内容は空にします（下の段落で表示するため）
            h1Inline.content = '';
            // 子要素配列を初期化します
            h1Inline.children = [];
            // トークン配列に追加します
            newTokens.push(h1Inline);
            
            // h1 タグの終了トークンを作成します
            const h1Close = new state.Token('heading_close', 'h1', -1);
            // ブロック要素としてマークします
            h1Close.block = true;
            // トークン配列に追加します
            newTokens.push(h1Close);
            
            // 目次見出し文字列用の段落開始タグを作成します
            const pTitleOpen = new state.Token('paragraph_open', 'p', 1);
            // ブロック要素としてマークします
            pTitleOpen.block = true;
            // トークン配列に追加します
            newTokens.push(pTitleOpen);
            
            // 目次タイトルインラインテキストを作成します（2ページ目以降は「続き」を付与）
            const pTitleInline = new state.Token('inline', '', 0);
            // タイトル文言を設定します
            pTitleInline.content = chunkIndex === 0 ? '目次' : '目次 (続き)';
            // 子要素としてテキストノードを設定します
            pTitleInline.children = [new state.Token('text', '', 0)];
            // テキスト内容を代入します
            pTitleInline.children[0].content = pTitleInline.content;
            // トークン配列に追加します
            newTokens.push(pTitleInline);
            
            // 目次見出し段落の終了トークンを作成します
            const pTitleClose = new state.Token('paragraph_close', 'p', -1);
            // ブロック要素としてマークします
            pTitleClose.block = true;
            // トークン配列に追加します
            newTokens.push(pTitleClose);
            
            // 箇条書きリスト ul の開始トークンを作成します
            const ulOpen = new state.Token('bullet_list_open', 'ul', 1);
            // ブロック要素としてマークします
            ulOpen.block = true;
            // トークン配列に追加します
            newTokens.push(ulOpen);
            
            // チャンク内の各見出し項目をリスト要素 li として生成します
            chunk.forEach(h => {
              // リスト項目 li の開始トークンを作成します
              const liOpen = new state.Token('list_item_open', 'li', 1);
              // ブロック要素としてマークします
              liOpen.block = true;
              // リーダー線描画用の文字数を算出します
              const charCount = Math.max(15, h.title.length);
              // CSSクラスと文字数変数を属性として設定します
              liOpen.attrs = [['class', 'toc-item'], ['style', `--char-count: ${charCount}`]];
              // トークン配列に追加します
              newTokens.push(liOpen);
              
              // リスト項目内の段落開始タグを作成します
              const pOpen = new state.Token('paragraph_open', 'p', 1);
              // ブロック要素としてマークします
              pOpen.block = true;
              // トークン配列に追加します
              newTokens.push(pOpen);
              
              // 複数スライド分割時のシフトを考慮したページ番号を算出します
              const targetPage = h.page + (totalAddedSlides - 1);

              // 段落内のインラインテキストコンテナを作成します
              const pInline = new state.Token('inline', '', 0);
              // タイトルとページ番号の基本テキストを設定します
              pInline.content = `${h.title} ${targetPage}`;
              
              // クリック可能なリンク開始タグ a を作成します
              const linkOpen = new state.Token('link_open', 'a', 1);
              // 対象スライドのページ内アンカーリンク属性を設定します
              linkOpen.attrs = [['href', `#${targetPage}`]];
              // リンクテキストトークンを作成します
              const linkText = new state.Token('text', '', 0);
              // タイトル文字列をリンクテキストに設定します
              linkText.content = h.title;
              // リンク終了タグ a を作成します
              const linkClose = new state.Token('link_close', 'a', -1);
              
              // ページ番号装飾用の span 開始HTMLを作成します
              const spanOpen = new state.Token('html_inline', '', 0);
              // span要素タグを設定します
              spanOpen.content = `<span class="toc-page">`;
              // ページ番号のテキストノードを作成します
              const spanText = new state.Token('text', '', 0);
              // ページ番号数値を文字列として設定します
              spanText.content = String(targetPage);
              // span 終了HTMLを作成します
              const spanClose = new state.Token('html_inline', '', 0);
              // 閉じタグを設定します
              spanClose.content = `</span>`;
              
              // インライン要素の子ノードを組み立てます
              pInline.children = [linkOpen, linkText, linkClose, spanOpen, spanText, spanClose];
              // トークン配列に追加します
              newTokens.push(pInline);
              
              // 段落終了タグを作成します
              const pClose = new state.Token('paragraph_close', 'p', -1);
              // ブロック要素としてマークします
              pClose.block = true;
              // トークン配列に追加します
              newTokens.push(pClose);
              
              // リスト項目 li の終了タグを作成します
              const liClose = new state.Token('list_item_close', 'li', -1);
              // ブロック要素としてマークします
              liClose.block = true;
              // トークン配列に追加します
              newTokens.push(liClose);
            });
            
            // 箇条書きリスト ul の終了タグを作成します
            const ulClose = new state.Token('bullet_list_close', 'ul', -1);
            // ブロック要素としてマークします
            ulClose.block = true;
            // トークン配列に追加します
            newTokens.push(ulClose);

            // 元スライドにh6フッター要素（コピーライト・機密指定）が存在する場合は各目次ページに複製注入します
            preservedFooterH6Tokens.forEach(t => {
              // 複製したh6関連トークンを追加します
              newTokens.push(cloneToken(t));
            });
            
            // 目次スライド section の終了タグを作成します
            const slideClose = new state.Token('marpit_slide_close', 'section', -1);
            // ブロック要素としてマークします
            slideClose.block = true;
            // 元のセクション終了タグの属性配列を引き継ぎます
            slideClose.attrs = origTocClose.attrs ? origTocClose.attrs.map(attr => [...attr]) : null;
            // 元のセクション終了タグのメタデータをディープコピーして引き継ぎます
            slideClose.meta = origTocClose.meta ? JSON.parse(JSON.stringify(origTocClose.meta)) : {};
            // チャンク番号に応じて0始まりスライドインデックスを更新します
            slideClose.meta.marpitSlide = currentSlideIndex;
            // メタ情報の総ページ数を更新します
            slideClose.meta.marpitSlideTotal = updatedSlideTotal;
            // Marpitのinline_svgおよびcollectプラグインが独立スライド終了と認識するフラグを設定します
            slideClose.meta.marpitSlideElement = -1;
            // トークン配列に追加します
            newTokens.push(slideClose);
          });
          
          // 目次スライドより前のスライド（表紙等）についても総スライド数メタデータを更新します
          for (let i = 0; i < tocStartIndex; i++) {
            // スライド開始または終了タグでmarpitSlideTotalを持つ場合
            if ((tokens[i].type === 'marpit_slide_open' || tokens[i].type === 'marpit_slide_close') && tokens[i].meta && tokens[i].meta.marpitSlideTotal !== undefined) {
              // 増加した目次スライド数を加算します
              tokens[i].meta.marpitSlideTotal += (totalAddedSlides - 1);
            }
          }

          // 元の目次スライドのトークン位置に、生成した新トークン群を置換挿入します
          tokens.splice(tocStartIndex, tocEndIndex - tocStartIndex + 1, ...newTokens);
          
          // 目次スライド以降の後続スライドについて、ページ番号のメタデータとアンカーID属性をシフトします
          for (let i = tocStartIndex + newTokens.length; i < tokens.length; i++) {
            // スライド開始タグのページ番号とid属性を調整します
            if (tokens[i].type === 'marpit_slide_open' && tokens[i].meta && tokens[i].meta.marpitSlide !== undefined) {
              // スライド番号を加算します
              tokens[i].meta.marpitSlide += (totalAddedSlides - 1);
              // 総スライド数を加算します
              tokens[i].meta.marpitSlideTotal += (totalAddedSlides - 1);
              // セクションのアンカーID属性をシフト後のページ番号（1始まり）に更新します
              tokens[i].attrSet('id', String(tokens[i].meta.marpitSlide + 1));
            }
            // スライド終了タグのスライド番号と総ページ数を調整します
            if (tokens[i].type === 'marpit_slide_close' && tokens[i].meta && tokens[i].meta.marpitSlideTotal !== undefined) {
              // スライド番号が存在する場合は加算します
              if (tokens[i].meta.marpitSlide !== undefined) {
                // スライド番号を加算します
                tokens[i].meta.marpitSlide += (totalAddedSlides - 1);
              }
              // 総スライド数を加算します
              tokens[i].meta.marpitSlideTotal += (totalAddedSlides - 1);
            }
          }
        }
      });
      
      // 2. 表やコードブロックの静的自動リサイズルールをパーサーに追加します
      md.core.ruler.push('auto_resize_static', (state) => {
        // 現在処理中のスライドIDカウンターを初期化します
        let currentSlideId = 0;
        // スライドの有効幅（px）の初期値です（余白差し引き後）
        let currentSlideWidth = 880;
        // ワイドコンテンツレイアウトかどうかを保持するフラグです
        let currentSlideIsWide = false;
        // 手動表サイズ調整クラスが指定されているか保持するフラグです
        let hasManualTableClass = false;
        // 手動コードサイズ調整クラスが指定されているか保持するフラグです
        let hasManualCodeClass = false;
        // 処理後のトークンを格納する配列です
        const newTokens = [];

        // 全トークンを走査して表やコードブロックのサイズを判定します
        for (let i = 0; i < state.tokens.length; i++) {
          // 現在のトークンを取得します
          const token = state.tokens[i];
          
          // スライドの開始タグを検出した場合
          if (token.type === 'marpit_slide_open') {
            // スライドIDをインクリメントします
            currentSlideId++;
            // スライドディレクティブを取得します
            const directives = token.meta && token.meta.marpitDirectives ? token.meta.marpitDirectives : {};
            // クラス文字列を取得します
            const classStr = directives.class || '';
            // クラス名を配列に分割します
            const slideClasses = classStr.split(/\s+/).filter(Boolean);
            // ワイドコンテンツクラスが指定されているか判定します
            currentSlideIsWide = slideClasses.includes('wide-content');
            // 手動の表サイズ調整クラスが指定されているか判定します
            hasManualTableClass = slideClasses.some(c => /^table-(\d+|xl|lg|md|sm|xs|xxs)$/.test(c));
            // 手動のコードサイズ調整クラスが指定されているか判定します
            hasManualCodeClass = slideClasses.some(c => /^code-(\d+|xl|lg|md|sm|xs|xxs)$/.test(c));
            // アスペクト比を取得します（未指定は4:3）
            const slideSize = directives.size || '4:3';
            // スライド全体の幅を決定します（16:9なら1280px、4:3なら960px）
            const fullWidth = slideSize === '16:9' ? 1280 : 960;
            // 左右パディング（計80px）を引いた有効幅を計算します
            currentSlideWidth = fullWidth - 80;
          }

          // 表の許容最大高さを決定します（ワイドコンテンツは領域が広いため550px、通常は440px）
          const maxTableHeight = currentSlideIsWide ? 550 : 440;
          // コードブロックの許容最大高さを決定します
          const maxPreHeight = currentSlideIsWide ? 550 : 440;

          // 表（Table）タグの開始を検出し、かつ手動表サイズクラスが指定されていない場合、内容量に応じてフォントサイズを縮小します
          if (token.type === 'table_open' && !hasManualTableClass) {
            // 行数カウンターを初期化します
            let rowCount = 0;
            // 表内の総文字数カウンターを初期化します
            let totalChars = 0;
            // 表内部のトークンを走査するためのインデックスです
            let j = i + 1;
            
            // 表の終了タグに達するまで行数と文字数をカウントします
            while (j < state.tokens.length && state.tokens[j].type !== 'table_close') {
              // 行開始タグを検出した場合は行数を加算します
              if (state.tokens[j].type === 'tr_open') {
                // 行数をカウントアップします
                rowCount++;
              // テキストまたはインライン要素を検出した場合は文字数を加算します
              } else if (state.tokens[j].type === 'inline' || state.tokens[j].type === 'text') {
                // 文字数をカウントアップします
                totalChars += state.tokens[j].content.length;
              }
              // 次のトークンへ進みます
              j++;
            }
            
            // 基本フォントサイズを18ptに設定します
            let fontSize = 18;
            // 最小許容フォントサイズを6ptに設定します
            const minFontSize = 6;
            
            // 推定高さが許容最大高さに収まるまでフォントサイズを0.5pt刻みで縮小します
            while (fontSize > minFontSize) {
              // ptをpxに変換します
              const fontPx = fontSize * 1.333;
              // 行の高さを計算します
              const lineH = fontPx * 1.3;
              // 1行あたりに入る目安文字数を算出します
              const charsPerLine = currentSlideWidth / fontPx;
              
              // 折り返しによって発生する追加行数を推定します
              const wrappedLines = Math.max(0, (totalChars / charsPerLine) - rowCount);
              // 推定総行数を計算します
              const totalLines = rowCount + wrappedLines;
              // 推定全体の高さを算出します（パディング含む）
              const estHeight = totalLines * lineH + (rowCount * 10);
              
              // 許容高さ内に収まったらループを抜けます
              if (estHeight <= maxTableHeight) {
                // 縮小完了
                break;
              }
              // 0.5pt小さくします
              fontSize -= 0.5;
            }
            
            // フォントサイズが縮小された場合、このスライド専用のスタイル要素を注入します
            if (fontSize < 18) {
              // HTMLブロックトークンを生成します
              const styleToken = new state.Token('html_block', '', 0);
              // スライドIDでスコープを絞ったCSSを定義します
              styleToken.content = `<style>section[id="${currentSlideId}"] table { font-size: ${fontSize}pt !important; line-height: 1.3 !important; } section[id="${currentSlideId}"] table th, section[id="${currentSlideId}"] table td { font-size: ${fontSize}pt !important; line-height: 1.3 !important; }</style>\n`;
              // トークン配列に追加します
              newTokens.push(styleToken);
            }
          }
          
          // コードブロック（fence）を検出し、かつ手動コードサイズクラスが指定されていない場合、行数・文字数に応じてフォントサイズを縮小します
          if (token.type === 'fence' && !hasManualCodeClass) {
            // 改行で分割して行数を取得します
            const lines = token.content.split('\n').length;
            // コードブロック全体の総文字数を取得します
            const totalChars = token.content.length;
            
            // 基本フォントサイズを18ptに設定します
            let fontSize = 18;
            // 最小許容フォントサイズを6ptに設定します
            const minFontSize = 6;
            
            // 推定高さが収まるまでフォントサイズを縮小します
            while (fontSize > minFontSize) {
              // ptをpxに変換します
              const fontPx = fontSize * 1.333;
              // 行の高さを計算します
              const lineH = fontPx * 1.3;
              // 等幅フォントの文字幅から1行の文字数を算出します
              const charsPerLine = (currentSlideWidth / fontPx) * 1.6;
              
              // 長い行の折り返し行数を推定します
              const wrappedLines = Math.max(0, (totalChars / charsPerLine) - lines);
              // 推定総行数を算出します
              const totalLines = lines + wrappedLines;
              // 推定全体の高さを計算します
              const estHeight = totalLines * lineH + 20;
              
              // 許容高さ内に収まったらループを終了します
              if (estHeight <= maxPreHeight) {
                // 縮小完了
                break;
              }
              // 0.5pt小さくします
              fontSize -= 0.5;
            }
            
            // フォントサイズが縮小された場合、このスライド専用のスタイル要素を注入します
            if (fontSize < 18) {
              // HTMLブロックトークンを生成します
              const styleToken = new state.Token('html_block', '', 0);
              // スライドIDでスコープを絞ったCSSを定義します
              styleToken.content = `<style>section[id="${currentSlideId}"] pre, section[id="${currentSlideId}"] pre code { font-size: ${fontSize}pt !important; line-height: 1.3 !important; }</style>\n`;
              // トークン配列に追加します
              newTokens.push(styleToken);
            }
          }
          
          // 現在のトークンを新しいトークン配列に追加します
          newTokens.push(token);
        }
        
        // 状態トークンを更新後の配列で上書きします
        state.tokens = newTokens;
      });
    });
    // 初期化されたMarpインスタンスを返却します
    return marp;
  }
};
