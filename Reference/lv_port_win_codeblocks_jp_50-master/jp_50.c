/**
 * @file jp_50.c
 *
 */

/*********************
 *      INCLUDES
 *********************/
#include "lvgl/lvgl.h"

/*********************
 *      DEFINES
 *********************/
#define SUM_50                      46
#define SUM_SONANT                  25
#define SUM_YONN                    33
#define SUM_ALL_IN_1                208
#define SUM_ALL_IN_1_ITEM_SIZE      32
#define SUM_ALL_IN_1_MPA_SUM        5



/**********************
 *      TYPEDEFS
 **********************/

/**********************
 *  STATIC PROTOTYPES
 **********************/
static void cb_hk_event_handler(lv_event_t * e);
static void cb_event_handler(lv_event_t * e);
static void btn_next_event_handler(lv_event_t * e);

static void update_all_in_1(void);
static void fill_all_in_1(char * src[], uint32_t sum);

/**********************
 *  STATIC VARIABLES
 **********************/

// https://www.coscom.co.jp/hiragana-katakana/kanatable-j.html
// あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポきゃきゅきょしゃしゅしょちゃちゅちょにゃにゅにょひゃひゅひょみゃみゅみょりゃりゅりょぎゃぎゅぎょじゃじゅじょびゃびゅびょぴゃぴゅぴょキャキュキョシャシュショチャチュチョニャニュニョヒャヒュヒョミャミュミョリャリュリョギャギュギョジャジュジョビャビュビョピャピュピョ
// 平假名：  ひらがな  hiragana
// 片假名：  カタカナ  katakana
// 五十音：  ごじゅうおん
// 浊音：    だくおん
// 拗音：    ようおん

// 平假名元音
static char * hiragana_50[SUM_50] = {
                                    "あ", "い", "う", "え", "お",\
                                    "か", "き", "く", "け", "こ", \
                                    "さ", "し", "す", "せ", "そ", \
                                    "た", "ち", "つ", "て", "と", \
                                    "な", "に", "ぬ", "ね", "の", \
                                    "は", "ひ", "ふ", "へ", "ほ", \
                                    "ま", "み", "む", "め", "も", \
                                    "や",       "ゆ",       "よ", \
                                    "ら", "り", "る", "れ", "ろ", \
                                    "わ",                   "を", \
                                    "ん"
                              };


// 片假名元音
static char * katakana_50[SUM_50] = {
                                    "ア", "イ", "ウ", "エ", "オ", \
                                    "カ", "キ", "ク", "ケ", "コ", \
                                    "サ", "シ", "ス", "セ", "ソ", \
                                    "タ", "チ", "ツ", "テ", "ト", \
                                    "ナ", "ニ", "ヌ", "ネ", "ノ", \
                                    "ハ", "ヒ", "フ", "ヘ", "ホ", \
                                    "マ", "ミ", "ム", "メ", "モ", \
                                    "ヤ",       "ユ",       "ヨ", \
                                    "ラ", "リ", "ル", "レ", "ロ", \
                                    "ワ",                   "ヲ", \
                                    "ン"
                              };

// 50音罗马字
static char * romaji_50[SUM_50] = {
                                    "a", "i", "u", "e", "o", \
                                    "ka", "ki", "ku", "ke", "ko", \
                                    "sa", "shi", "su", "se", "so", \
                                    "ta", "chi", "tsu", "te", "to", \
                                    "na", "ni", "nu", "ne", "no", \
                                    "ha", "hi", "fu", "he", "ho", \
                                    "ma", "mi", "mu", "me", "mo", \
                                    "ya",       "yu",       "yo", \
                                    "ra", "ri", "ru", "re", "ro", \
                                    "wa",                   "o", \
                                    "n"
                              };
// 片假名浊音
static char * hiragana_sonant[SUM_SONANT] = {
                                    "が", "ぎ", "ぐ", "げ", "ご", \
                                    "ざ", "じ", "ず", "ぜ", "ぞ", \
                                    "だ", "ぢ", "づ", "で", "ど", \
                                    "ば", "び", "ぶ", "べ", "ぼ", \
                                    "ぱ", "ぴ", "ぷ", "ぺ", "ぽ"
                                  };

// 平假名浊音
static char * katakana_sonant[SUM_SONANT] = {
                                    "ガ", "ギ", "グ", "ゲ", "ゴ", \
                                    "ザ", "ジ", "ズ", "ゼ", "ゾ", \
                                    "ダ", "ヂ", "ヅ", "デ", "ド", \
                                    "バ", "ビ", "ブ", "ベ", "ボ", \
                                    "パ", "ピ", "プ", "ペ", "ポ"
                                  };

 // 浊音罗马字
static char * romaji_sonant[SUM_SONANT] = {
                                    "ga", "gi", "gu", "ge", "go", \
                                    "za", "ji", "zu", "ze", "zo", \
                                    "da", "ji", "zu", "de", "do", \
                                    "ba", "bi", "bu", "be", "bo", \
                                    "pa", "pi", "pu", "pe", "po"
                                  };

// 片假名拗音
static char * hiragana_yoon[SUM_YONN] = {
                                    "きゃ", "きゅ", "きょ", \
                                    "しゃ", "しゅ", "しょ", \
                                    "ちゃ", "ちゅ", "ちょ", \
                                    "にゃ", "にゅ", "にょ", \
                                    "ひゃ", "ひゅ", "ひょ", \
                                    "みゃ", "みゅ", "みょ", \
                                    "りゃ", "りゅ", "りょ", \
                                    "ぎゃ", "ぎゅ", "ぎょ", \
                                    "じゃ", "じゅ", "じょ", \
                                    "びゃ", "びゅ", "びょ", \
                                    "ぴゃ", "ぴゅ", "ぴょ"
                                };


// 平假名拗音
static char * katakana_yoon[SUM_YONN] = {
                                    "キャ", "キュ", "キョ", \
                                    "シャ", "シュ", "ショ", \
                                    "チャ", "チュ", "チョ", \
                                    "ニャ", "ニュ", "ニョ", \
                                    "ヒャ", "ヒュ", "ヒョ", \
                                    "ミャ", "ミュ", "ミョ", \
                                    "リャ", "リュ", "リョ", \
                                    "ギャ", "ギュ", "ギョ", \
                                    "ジャ", "ジュ", "ジョ", \
                                    "ビャ", "ビュ", "ビョ", \
                                    "ピャ", "ピュ", "ピョ"
                                };

// 拗音罗马字
static char *romaji_yoon[SUM_YONN] = {
                                    "kya", "kyu", "kyo", \
                                    "sha", "shu", "sho", \
                                    "cha", "chu", "cho", \
                                    "nya", "nyu", "nyo", \
                                    "hya", "hyu", "hyo", \
                                    "mya", "myu", "myo", \
                                    "rya", "ryu", "ryo", \
                                    "gya", "gyu", "gyo", \
                                    "ja", "ju", "jo", \
                                    "bya", "byu", "byo", \
                                    "pya", "pyu", "pyo"
                                };


static char all_in_1[SUM_ALL_IN_1][SUM_ALL_IN_1_ITEM_SIZE] = {"キャ"};


static uint32_t all_in_1_sum = 0;
static uint8_t all_in_1_map[SUM_ALL_IN_1_MPA_SUM] = {1};

/**********************
 *      MACROS
 **********************/
LV_FONT_DECLARE(lv_font_jp50_22);
LV_FONT_DECLARE(lv_font_jp50_50);
LV_FONT_DECLARE(lv_font_jp50_100);
LV_FONT_DECLARE(lv_font_jp50_200);

/**********************
 *   GLOBAL FUNCTIONS
 **********************/

void jp_50_init(void)
{
    lv_obj_t * cb;
    lv_obj_t * cb_h;
    lv_obj_t * cb_k;
    lv_obj_t * label;
    lv_obj_t * btn_next;
    lv_obj_t * label_jp50;

    lv_obj_t * cont_cb = lv_obj_create(lv_screen_active());
    lv_obj_remove_style_all(cont_cb);
    lv_obj_set_size(cont_cb, LV_PCT(100), LV_SIZE_CONTENT);
    lv_obj_set_style_text_font(cont_cb, &lv_font_jp50_22, 0);
    lv_obj_set_align(cont_cb, LV_ALIGN_TOP_MID);
    lv_obj_set_flex_flow(cont_cb, LV_FLEX_FLOW_ROW);
    lv_obj_set_style_pad_top(cont_cb, 4, 0);
    lv_obj_set_style_pad_bottom(cont_cb, 4, 0);
    lv_obj_set_style_pad_column(cont_cb, 20, 0);
    lv_obj_set_flex_align(cont_cb, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_SPACE_AROUND);

    //
    cb_h = lv_checkbox_create(cont_cb);
    lv_checkbox_set_text(cb_h, "ひらがな"); // [0] 平假名：  ひらがな
    lv_obj_add_state(cb_h, LV_STATE_CHECKED);
    lv_obj_add_event_cb(cb_h, cb_event_handler, LV_EVENT_VALUE_CHANGED, NULL);

    cb_k = lv_checkbox_create(cont_cb);
    lv_checkbox_set_text(cb_k, "カタカナ"); // [1] 片假名：  カタカナ
    lv_obj_add_state(cb_k, LV_STATE_CHECKED);
    lv_obj_add_event_cb(cb_h, cb_hk_event_handler, LV_EVENT_VALUE_CHANGED, cb_k);
    lv_obj_add_event_cb(cb_k, cb_hk_event_handler, LV_EVENT_VALUE_CHANGED, cb_h);
    lv_obj_add_event_cb(cb_k, cb_event_handler, LV_EVENT_VALUE_CHANGED, NULL);

    cb = lv_checkbox_create(cont_cb);
    lv_checkbox_set_text(cb, "ごじゅうおん");  // [2] 五十音：  ごじゅうおん
    lv_obj_add_state(cb, LV_STATE_CHECKED);
    lv_obj_add_event_cb(cb, cb_event_handler, LV_EVENT_VALUE_CHANGED, NULL);

    cb = lv_checkbox_create(cont_cb);
    lv_checkbox_set_text(cb, "だくおん");  // [3] 浊音：    だくおん
    lv_obj_add_state(cb, LV_STATE_CHECKED);
    lv_obj_add_event_cb(cb, cb_event_handler, LV_EVENT_VALUE_CHANGED, NULL);

    cb = lv_checkbox_create(cont_cb);
    lv_checkbox_set_text(cb, "ようおん");  // [4] 拗音：    ようおん
    lv_obj_add_state(cb, LV_STATE_CHECKED);
    lv_obj_add_event_cb(cb, cb_event_handler, LV_EVENT_VALUE_CHANGED, NULL);

    //cb = lv_checkbox_create(cont_cb);
    //lv_checkbox_set_text(cb, "ロ－マじ");  // [5] 罗马字：  ロ－マじ
    //lv_obj_add_state(cb, LV_STATE_CHECKED);
    //lv_obj_add_event_cb(cb, cb_event_handler, LV_EVENT_VALUE_CHANGED, NULL);

    //
    label_jp50 = lv_label_create(lv_screen_active());
    lv_obj_set_style_text_font(label_jp50, &lv_font_jp50_200, 0);
    lv_obj_align(label_jp50, LV_ALIGN_CENTER, 0, 0);

    //
    btn_next = lv_button_create(lv_screen_active());
    lv_obj_add_event_cb(btn_next, btn_next_event_handler, LV_EVENT_CLICKED, label_jp50);
    lv_obj_align(btn_next, LV_ALIGN_BOTTOM_MID, 0, -8);

    label = lv_label_create(btn_next);
    lv_obj_set_style_text_font(label, &lv_font_jp50_50, 0);
    lv_label_set_text(label, "つぎへ");
    //lv_label_set_text(label, "ネクスト");
    lv_obj_align(label, LV_ALIGN_CENTER, 0, 0);

    //
    srand((unsigned)time(NULL));

    lv_memset(all_in_1_map, 1, SUM_ALL_IN_1_MPA_SUM);
    update_all_in_1();
    lv_label_set_text_fmt(label_jp50, "%s", all_in_1[rand()%(all_in_1_sum -  1)]);
}

/**********************
 *   STATIC FUNCTIONS
 **********************/
static void update_all_in_1(void)
{
    all_in_1_sum = 0;
    lv_memzero(all_in_1, sizeof(all_in_1));

    if(all_in_1_map[0] == 1)
    {
        if(all_in_1_map[2] == 1)         fill_all_in_1(hiragana_50, SUM_50);
        if(all_in_1_map[3] == 1)    fill_all_in_1(hiragana_sonant, SUM_SONANT);
        if(all_in_1_map[4] == 1)    fill_all_in_1(hiragana_yoon, SUM_YONN);
    }

    if(all_in_1_map[1] == 1)
    {
        if(all_in_1_map[2] == 1)         fill_all_in_1(katakana_50, SUM_50);
        if(all_in_1_map[3] == 1)    fill_all_in_1(katakana_sonant, SUM_SONANT);
        if(all_in_1_map[4] == 1)    fill_all_in_1(katakana_yoon, SUM_YONN);
    }

#if 0
    for(uint32_t i = 0; i < SUM_ALL_IN_1_MPA_SUM; i++)
        printf("all_in_1_map[%d]=%d, ", i, all_in_1_map[i]);

    printf("\n");
#endif

}


static void fill_all_in_1(char * src[], uint32_t sum)
{
    for (uint32_t i = 0; i < sum; i++)
    {
        lv_memcpy(all_in_1[all_in_1_sum + i], src[i], sizeof(src[i]));
    }

    all_in_1_sum += sum;

    //printf("all_in_1_sum:%d\n", all_in_1_sum);
}

static void cb_hk_event_handler(lv_event_t * e)
{
    lv_event_code_t code = lv_event_get_code(e);
    lv_obj_t * cb = lv_event_get_target(e);
    lv_obj_t * cb_another = lv_event_get_user_data(e);

    //lv_obj_t * cb_parent = lv_obj_get_parent(cb);
    //lv_obj_t * cb_hiragana = lv_obj_get_child(cb_parent, 0);  // 平假名
    //lv_obj_t * cb_katakana = lv_obj_get_child(cb_parent, 1);  // 片假名
    //lv_obj_t * cb_50 = lv_obj_get_child(cb_parent, 2);
    //lv_obj_t * cb_sonant = lv_obj_get_child(cb_parent, 3);
    //lv_obj_t * cb_yoon = lv_obj_get_child(cb_parent, 4);


    if(code == LV_EVENT_VALUE_CHANGED) {
        if((lv_obj_get_state(cb) & LV_STATE_CHECKED) == 0)
        {
            lv_obj_add_state(cb_another, LV_STATE_CHECKED);
            lv_obj_send_event(cb_another, LV_EVENT_VALUE_CHANGED, NULL);

        }

    }
}

static void cb_event_handler(lv_event_t * e)
{
    lv_event_code_t code = lv_event_get_code(e);
    lv_obj_t * cb = lv_event_get_target(e);

    if(code == LV_EVENT_VALUE_CHANGED) {
        const char * txt = lv_checkbox_get_text(cb);

        if(lv_obj_get_state(cb) & LV_STATE_CHECKED)
        {
            if(lv_strcmp(txt, "ひらがな") == 0){
                all_in_1_map[0] = 1;
            }
            else if(lv_strcmp(txt, "カタカナ") == 0){
                all_in_1_map[1] = 1;
            }
            else if(lv_strcmp(txt, "ごじゅうおん") == 0){
                all_in_1_map[2] = 1;
            }
            else if(lv_strcmp(txt, "だくおん") == 0){
                all_in_1_map[3] = 1;
            }
            else if(lv_strcmp(txt, "ようおん") == 0){
                all_in_1_map[4] = 1;
            }
        }
        else
        {
            if(lv_strcmp(txt, "ひらがな") == 0){
                all_in_1_map[0] = 0;
            }
            else if(lv_strcmp(txt, "カタカナ") == 0){
                all_in_1_map[1] = 0;
            }
            else if(lv_strcmp(txt, "ごじゅうおん") == 0){
                all_in_1_map[2] = 0;
            }
            else if(lv_strcmp(txt, "だくおん") == 0){
                all_in_1_map[3] = 0;
            }
            else if(lv_strcmp(txt, "ようおん") == 0){
                all_in_1_map[4] = 0;
            }
        }
        update_all_in_1();
    }
}

static void btn_next_event_handler(lv_event_t * e)
{
    lv_obj_t * label_jp50 = lv_event_get_user_data(e);

    //lv_label_set_text_fmt(label_jp50, "%s", all_in_1[lv_rand(0, all_in_1_sum -  1)]);

    lv_label_set_text_fmt(label_jp50, "%s", all_in_1[rand()%(all_in_1_sum -  1)]);
}
