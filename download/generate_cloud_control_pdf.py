# -*- coding: utf-8 -*-
import os
import sys

# Setup
PDF_SKILL_DIR = "/home/z/my-project/skills/pdf"
_scripts = os.path.join(PDF_SKILL_DIR, "scripts")
if _scripts not in sys.path:
    sys.path.insert(0, _scripts)

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, CondPageBreak
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import SimpleDocTemplate
import hashlib

# ━━ Color Palette ━━
ACCENT = colors.HexColor('#4b28b5')
TEXT_PRIMARY = colors.HexColor('#1e1f21')
TEXT_MUTED = colors.HexColor('#767b82')
BG_SURFACE = colors.HexColor('#e0e3e7')
BG_PAGE = colors.HexColor('#edeef0')
TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT = colors.white
TABLE_ROW_EVEN = colors.white
TABLE_ROW_ODD = BG_SURFACE

# ━━ Font Registration ━━
pdfmetrics.registerFont(TTFont('NotoSansSC', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('NotoSansSCReg', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSC', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSCBold', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Carlito', '/usr/share/fonts/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('CarlitoBold', '/usr/share/fonts/truetype/english/Carlito-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSansBold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))

registerFontFamily('NotoSansSC', normal='NotoSansSCReg', bold='NotoSansSC')
registerFontFamily('SarasaMonoSC', normal='SarasaMonoSC', bold='SarasaMonoSCBold')
registerFontFamily('Carlito', normal='Carlito', bold='CarlitoBold')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSansBold')

try:
    from pdf import install_font_fallback
    install_font_fallback()
except:
    pass

# ━━ Page Settings ━━
PAGE_W, PAGE_H = A4
LEFT_MARGIN = 1.0 * inch
RIGHT_MARGIN = 1.0 * inch
TOP_MARGIN = 0.8 * inch
BOTTOM_MARGIN = 0.8 * inch
CONTENT_W = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN

# ━━ Styles ━━
style_title = ParagraphStyle(
    name='DocTitle', fontName='NotoSansSC', fontSize=22, leading=30,
    alignment=TA_CENTER, spaceAfter=6, textColor=TEXT_PRIMARY
)
style_subtitle = ParagraphStyle(
    name='Subtitle', fontName='SarasaMonoSC', fontSize=12, leading=18,
    alignment=TA_CENTER, spaceAfter=24, textColor=TEXT_MUTED
)
style_h1 = ParagraphStyle(
    name='H1', fontName='NotoSansSC', fontSize=18, leading=26,
    spaceBefore=18, spaceAfter=10, textColor=TEXT_PRIMARY
)
style_h2 = ParagraphStyle(
    name='H2', fontName='NotoSansSC', fontSize=14, leading=20,
    spaceBefore=14, spaceAfter=8, textColor=ACCENT
)
style_h3 = ParagraphStyle(
    name='H3', fontName='NotoSansSC', fontSize=12, leading=17,
    spaceBefore=10, spaceAfter=6, textColor=TEXT_PRIMARY
)
style_body = ParagraphStyle(
    name='Body', fontName='SarasaMonoSC', fontSize=10.5, leading=18,
    alignment=TA_LEFT, wordWrap='CJK', spaceAfter=6,
    firstLineIndent=21, textColor=TEXT_PRIMARY
)
style_body_no_indent = ParagraphStyle(
    name='BodyNoIndent', fontName='SarasaMonoSC', fontSize=10.5, leading=18,
    alignment=TA_LEFT, wordWrap='CJK', spaceAfter=6, textColor=TEXT_PRIMARY
)
style_code = ParagraphStyle(
    name='Code', fontName='SarasaMonoSC', fontSize=9, leading=14,
    alignment=TA_LEFT, wordWrap='CJK', spaceAfter=4,
    leftIndent=12, textColor=colors.HexColor('#333333'),
    backColor=colors.HexColor('#f5f5f5'),
    borderColor=colors.HexColor('#e0e0e0'),
    borderWidth=0.5, borderPadding=6
)
style_bullet = ParagraphStyle(
    name='Bullet', fontName='SarasaMonoSC', fontSize=10.5, leading=18,
    alignment=TA_LEFT, wordWrap='CJK', spaceAfter=4,
    leftIndent=24, bulletIndent=12, textColor=TEXT_PRIMARY
)
style_table_header = ParagraphStyle(
    name='TH', fontName='SarasaMonoSC', fontSize=10, leading=14,
    alignment=TA_CENTER, textColor=colors.white
)
style_table_cell = ParagraphStyle(
    name='TC', fontName='SarasaMonoSC', fontSize=9.5, leading=14,
    alignment=TA_LEFT, wordWrap='CJK', textColor=TEXT_PRIMARY
)
style_table_cell_center = ParagraphStyle(
    name='TCC', fontName='SarasaMonoSC', fontSize=9.5, leading=14,
    alignment=TA_CENTER, wordWrap='CJK', textColor=TEXT_PRIMARY
)

# ━━ TOC Support ━━
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/>%s' % (key, '<b>%s</b>' % text), style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

H1_ORPHAN_THRESHOLD = (PAGE_H - TOP_MARGIN - BOTTOM_MARGIN) * 0.15

def add_major_section(text):
    return [
        CondPageBreak(H1_ORPHAN_THRESHOLD),
        add_heading(text, style_h1, level=0),
    ]

# ━━ Table Helper ━━
def make_table(headers, rows, col_ratios=None):
    if col_ratios is None:
        n = len(headers)
        col_ratios = [1.0/n] * n
    col_widths = [r * CONTENT_W for r in col_ratios]
    
    data = [[Paragraph('<b>%s</b>' % h, style_table_header) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), style_table_cell) for c in row])
    
    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_ODD if i % 2 == 0 else TABLE_ROW_EVEN
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

# ━━ Build Document ━━
OUTPUT_PATH = "/home/z/my-project/download/Mcpatch2JavaClient_云控方案设计.pdf"

doc = TocDocTemplate(
    OUTPUT_PATH,
    pagesize=A4,
    leftMargin=LEFT_MARGIN,
    rightMargin=RIGHT_MARGIN,
    topMargin=TOP_MARGIN,
    bottomMargin=BOTTOM_MARGIN,
    title="Mcpatch2JavaClient 云控方案设计",
    author="Z.ai",
    creator="Z.ai"
)

story = []

# ━━ Cover ━━
story.append(Spacer(1, 120))
story.append(Paragraph('<b>Mcpatch2JavaClient</b>', style_title))
story.append(Spacer(1, 8))
story.append(Paragraph('<b>mcpatch.yml 云控配置下发方案</b>', ParagraphStyle(
    name='CoverSub', fontName='NotoSansSC', fontSize=16, leading=24,
    alignment=TA_CENTER, textColor=ACCENT
)))
story.append(Spacer(1, 40))
story.append(Paragraph('基于 RSA 签名验证的远程配置管理与安全下发机制', style_subtitle))
story.append(Spacer(1, 60))

meta_data = [
    ['项目名称', 'Mcpatch2JavaClient'],
    ['文档类型', '技术方案设计'],
    ['版本', 'V1.0'],
    ['日期', '2026-04-29'],
]
meta_table = Table(meta_data, colWidths=[CONTENT_W*0.3, CONTENT_W*0.5], hAlign='CENTER')
meta_table.setStyle(TableStyle([
    ('TEXTCOLOR', (0, 0), (0, -1), TEXT_MUTED),
    ('TEXTCOLOR', (1, 0), (1, -1), TEXT_PRIMARY),
    ('FONTNAME', (0, 0), (-1, -1), 'SarasaMonoSC'),
    ('FONTSIZE', (0, 0), (-1, -1), 10),
    ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
    ('ALIGN', (1, 0), (1, -1), 'LEFT'),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
]))
story.append(meta_table)

story.append(PageBreak())

# ━━ TOC ━━
toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle(name='TOC1', fontName='SarasaMonoSC', fontSize=13, leftIndent=20, leading=22, spaceBefore=6),
    ParagraphStyle(name='TOC2', fontName='SarasaMonoSC', fontSize=11, leftIndent=40, leading=18, spaceBefore=3),
]
story.append(Paragraph('<b>目录</b>', ParagraphStyle(
    name='TOCTitle', fontName='NotoSansSC', fontSize=20, leading=28,
    alignment=TA_CENTER, spaceAfter=18, textColor=TEXT_PRIMARY
)))
story.append(toc)
story.append(PageBreak())

# ═══════════════════════════════════════════
# 一、背景与现状分析
# ═══════════════════════════════════════════
story.extend(add_major_section('一、背景与现状分析'))

story.append(Paragraph(
    'Mcpatch2JavaClient 是一个 Minecraft 资源文件自动更新客户端，通过读取 mcpatch.yml 配置文件来决定更新服务器的地址、防盗链鉴权参数、下载线程数等关键行为。当前配置加载流程完全依赖本地文件，用户可以直接修改配置文件中的任何字段，包括关闭防盗链鉴权、修改鉴权服务器地址、更改 uid 等敏感参数，从而绕过整个鉴权体系。这种情况下，即使服务端部署了阿里云 ESA 防盗链方案，客户端只要将 anti-hotlink-enabled 设为 false 即可完全跳过鉴权流程，直接使用原始 URL 下载文件。',
    style_body
))
story.append(Paragraph(
    '现有的鉴权体系 AuthKeyService (AuthKeyService.java) 采用的是阿里云 ESA A 方案，通过向鉴权服务器请求 auth_key 并拼接到下载 URL 中实现防盗链。然而这个鉴权机制的所有参数（auth_api_url、expire_time、uid）全部来自本地配置文件，用户可以轻易篡改。同时，项目缺少一种集中化的配置管理手段，当需要更新服务器地址、调整鉴权参数、或者紧急下线某个分发渠道时，只能依赖用户手动更新本地的 mcpatch.yml 文件，这在实际运营中是不可接受的。',
    style_body
))
story.append(Paragraph(
    '为了从根本上解决这些问题，我们需要引入"云控"机制——每次客户端启动时，自动从云端服务器拉取最新的配置内容，使用 RSA 签名验证配置的完整性和真实性，并用云端下发的配置覆盖本地配置中的敏感字段。这样管理员可以在服务端统一管理所有客户端的配置，用户无法通过修改本地文件来绕过鉴权或其他安全策略。',
    style_body
))

story.append(add_heading('1.1 当前配置加载流程', style_h2, level=1))
story.append(Paragraph(
    '当前配置加载逻辑位于 Main.java 的 readConfig() 方法中（第318-362行），流程非常简单：首先检查程序目录下是否存在外部的 mcpatch.yml 文件，如果存在则直接读取并解析为 YAML；如果不存在，则尝试从 JAR 包内部读取内置的 mcpatch.yml 资源文件。无论哪种方式，配置内容都完全来自本地，没有任何来自服务端的校验或覆盖机制。',
    style_body
))

story.append(Spacer(1, 12))
story.append(KeepTogether([
    make_table(
        ['步骤', '操作', '文件来源'],
        [
            ['1', '检查外部 mcpatch.yml 是否存在', 'Main.java:327'],
            ['2', '存在 -> 读取外部文件', '程序目录/mcpatch.yml'],
            ['3', '不存在 -> 从 JAR 包内读取', 'JAR:resources/mcpatch.yml'],
            ['4', '解析 YAML -> 构建 AppConfig 对象', 'AppConfig.java 构造函数'],
        ],
        [0.08, 0.47, 0.45]
    ),
    Paragraph('表1: 当前配置加载流程', ParagraphStyle(
        name='Caption', fontName='SarasaMonoSC', fontSize=9, leading=14,
        alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=6, spaceBefore=3
    ))
]))

story.append(add_heading('1.2 当前安全风险', style_h2, level=1))
story.append(Paragraph(
    '当前架构存在以下核心安全风险：第一，anti-hotlink-enabled 开关可被用户自由关闭，一旦关闭，客户端将不再请求鉴权服务器获取 auth_key，直接使用原始 URL 下载所有文件，完全绕过防盗链保护。第二，anti-hotlink-auth-url 鉴权 API 地址可被用户替换为自建服务器，返回伪造的 auth_key。第三，anti-hotlink-uid 可被用户修改为任意值，破坏基于 uid 的访问控制和流量统计。',
    style_body
))
story.append(Paragraph(
    '此外，urls 更新服务器地址列表也可以被修改，用户可以指向自己的服务器来提供恶意更新包，或者指向一个不存在的地址让程序在检查更新时反复超时。version-file-path 路径也可以被篡改，导致版本号永远不变或不断重置，使更新检测逻辑失效。这些风险表明，仅靠本地配置文件来控制客户端行为是完全不够的，必须有服务端参与配置管理和验证。',
    style_body
))

# ═══════════════════════════════════════════
# 二、云控架构设计
# ═══════════════════════════════════════════
story.extend(add_major_section('二、云控架构设计'))

story.append(Paragraph(
    '云控方案的核心思想是：客户端启动时，先读取本地配置文件获取基础配置（包含云控开关和 API 地址等引导信息），然后根据配置判断是否需要从云端拉取最新配置。如果启用云控，客户端将向云端 API 发起请求，获取经过 RSA 签名的配置内容，验证签名通过后将云端配置合并到本地配置中，覆盖其中的敏感字段。整个过程中，签名验证、密钥管理、请求防伪等安全措施确保了配置内容的真实性和不可篡改性。',
    style_body
))

story.append(add_heading('2.1 整体架构', style_h2, level=1))
story.append(Paragraph(
    '云控系统由三个核心组件构成：客户端的 CloudConfigService（负责拉取、验证、合并配置）、云端的 Config API（负责接收请求、查询配置、签名响应）、以及管理后台（负责配置的编辑、版本管理和发布）。客户端在启动流程的最早期（读取本地配置之后、执行更新逻辑之前）介入，确保在后续所有网络操作开始之前，配置已经被正确地设置为云端下发的版本。',
    style_body
))

story.append(Paragraph(
    '考虑到 Minecraft 客户端的启动场景，云控请求必须尽量轻量且快速。配置文件通常不超过 10KB，在正常网络环境下获取延迟应控制在 500ms 以内。同时，为了应对网络不稳定的情况，客户端需要实现配置缓存机制——当云端请求失败时，使用上一次成功获取的缓存配置，而不是直接回退到本地配置。只有当缓存也不存在时，才降级使用本地配置文件，确保在任何极端情况下客户端都能启动（虽然此时安全性无法保证）。',
    style_body
))

story.append(add_heading('2.2 改造后的配置加载流程', style_h2, level=1))
story.append(Paragraph(
    '改造后的配置加载流程在原有基础上新增了云控拉取步骤。具体流程如下：首先读取本地 mcpatch.yml 获取基础配置，解析其中的 cloud-control-enabled 字段判断是否启用云控。如果未启用，走原有的本地配置流程。如果启用，则检查本地是否存在云控缓存文件（.mcpatch-cloud-cache），并判断缓存是否过期（对比 TTL 时间）。',
    style_body
))
story.append(Paragraph(
    '如果缓存有效，直接使用缓存中的配置数据。如果缓存过期或不存在，向云端 API 发起 HTTPS 请求，请求中包含 clientId（客户端标识）、clientVersion（当前版本号）、timestamp（时间戳）和 HMAC 请求签名。云端 API 验证请求合法性后，返回包含配置内容（Base64 编码）、RSA 签名、配置版本号等信息的 JSON 响应。',
    style_body
))
story.append(Paragraph(
    '客户端收到响应后，首先使用内置的 RSA 公钥验证签名——验证对象是 config 字段和 configVersion 字段的拼接字符串。签名验证通过后，Base64 解码获取完整的 mcpatch.yml 内容，解析为 YAML Map，然后执行深度合并操作：云端配置中的关键字段（urls、anti-hotlink-* 等）将覆盖本地配置中的对应值，而其他字段（如 base-path、window-title 等个性化设置）则保留本地值。合并后的最终配置将用于初始化 AppConfig 对象，并更新本地缓存文件。',
    style_body
))

story.append(add_heading('2.3 配置合并策略', style_h2, level=1))
story.append(Paragraph(
    '配置合并采用"云端优先、选择性覆盖"的策略。不是将整个配置替换为云端版本（这会导致用户无法自定义 window-title、base-path 等非安全相关的个性化设置），而是只覆盖管理员指定的安全敏感字段。这样可以同时满足安全管控和用户自定义的需求。',
    style_body
))

story.append(Spacer(1, 12))
story.append(KeepTogether([
    make_table(
        ['配置字段', '合并策略', '覆盖原因'],
        [
            ['urls', '云端覆盖', '更新服务器地址，防止指向私服'],
            ['anti-hotlink-enabled', '云端覆盖', '防盗链开关必须受控'],
            ['anti-hotlink-auth-url', '云端覆盖', '鉴权 API 地址不可篡改'],
            ['anti-hotlink-expire-time', '云端覆盖', '鉴权过期时间需统一管理'],
            ['anti-hotlink-uid', '云端覆盖', '鉴权用户 ID 需统一管理'],
            ['cloud-control-enabled', '云端覆盖', '云控开关本身不可篡改'],
            ['cloud-control-api-url', '云端覆盖', '云控 API 地址需受保护'],
            ['window-title', '保留本地', '用户个性化设置，不影响安全'],
            ['base-path', '保留本地', '部署路径，每个用户不同'],
            ['silent-mode', '保留本地', 'UI 偏好设置'],
            ['disable-theme', '保留本地', 'UI 偏好设置'],
            ['max-threads / chunk-size', '云端覆盖', '下载策略需统一管理'],
        ],
        [0.30, 0.17, 0.53]
    ),
    Paragraph('表2: 配置字段合并策略', ParagraphStyle(
        name='Caption2', fontName='SarasaMonoSC', fontSize=9, leading=14,
        alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=6, spaceBefore=3
    ))
]))

# ═══════════════════════════════════════════
# 三、云端 API 设计
# ═══════════════════════════════════════════
story.extend(add_major_section('三、云端 API 设计'))

story.append(add_heading('3.1 接口规范', style_h2, level=1))
story.append(Paragraph(
    '云端配置 API 设计为简洁的 RESTful 接口，使用 GET 方法请求，响应格式为 JSON。接口设计遵循最小化原则，只传递必要的信息，减少网络传输量和解析开销。为了防止 API 被第三方直接调用滥用，接口要求请求中携带 HMAC 签名和时间戳，服务端会验证签名的合法性和时间戳的有效性（不超过5分钟），拒绝无效或过期的请求。',
    style_body
))

story.append(Spacer(1, 12))
story.append(KeepTogether([
    make_table(
        ['属性', '值'],
        [
            ['接口路径', 'GET /api/config'],
            ['Content-Type', 'application/json'],
            ['请求方式', 'GET (参数通过 QueryString 传递)'],
            ['响应格式', 'JSON'],
            ['字符编码', 'UTF-8'],
            ['传输加密', 'HTTPS (TLS 1.2+)'],
        ],
        [0.30, 0.70]
    ),
    Paragraph('表3: API 基础信息', ParagraphStyle(
        name='Caption3', fontName='SarasaMonoSC', fontSize=9, leading=14,
        alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=6, spaceBefore=3
    ))
]))

story.append(add_heading('3.2 请求参数', style_h2, level=1))
story.append(Spacer(1, 12))
story.append(KeepTogether([
    make_table(
        ['参数名', '类型', '必填', '说明'],
        [
            ['clientId', 'String', '是', '客户端标识，用于区分不同分发渠道的配置'],
            ['clientVersion', 'String', '是', '当前客户端版本号，来自 Manifest'],
            ['timestamp', 'Long', '是', '当前 Unix 时间戳（毫秒），防重放攻击'],
            ['signature', 'String', '是', 'HMAC-SHA256 请求签名，验证请求合法性'],
        ],
        [0.18, 0.10, 0.08, 0.64]
    ),
    Paragraph('表4: 请求参数说明', ParagraphStyle(
        name='Caption4', fontName='SarasaMonoSC', fontSize=9, leading=14,
        alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=6, spaceBefore=3
    ))
]))

story.append(add_heading('3.3 响应格式', style_h2, level=1))
story.append(Paragraph(
    '服务端响应包含配置内容、签名信息、版本号以及可选的控制指令。配置内容使用 Base64 编码传输，避免 JSON 转义问题。签名是对 config 字段原始值（Base64 字符串）和 configVersion 字段拼接后进行 RSA-SHA256 签名的结果，客户端使用内置的 RSA 公钥验证此签名。disabled 字段为 true 时表示管理员已禁用该客户端渠道，forceUpdate 字段为 true 时表示需要强制更新客户端版本。notice 字段可用于向用户推送维护公告等通知信息。',
    style_body
))

story.append(Spacer(1, 12))
story.append(KeepTogether([
    make_table(
        ['字段', '类型', '说明'],
        [
            ['code', 'Integer', '状态码，200 表示成功'],
            ['config', 'String', 'Base64 编码的 mcpatch.yml 完整内容'],
            ['configVersion', 'String', '配置版本号，格式如 2026042901'],
            ['signature', 'String', 'RSA-SHA256 签名（Base64 编码）'],
            ['forceUpdate', 'Boolean', '是否强制客户端更新'],
            ['notice', 'String', '可选的公告文本，用于推送通知'],
            ['disabled', 'Boolean', '是否禁用该客户端渠道'],
        ],
        [0.18, 0.12, 0.70]
    ),
    Paragraph('表5: 响应字段说明', ParagraphStyle(
        name='Caption5', fontName='SarasaMonoSC', fontSize=9, leading=14,
        alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=6, spaceBefore=3
    ))
]))

# ═══════════════════════════════════════════
# 四、安全机制设计
# ═══════════════════════════════════════════
story.extend(add_major_section('四、安全机制设计'))

story.append(Paragraph(
    '云控方案的安全性是整个设计的核心。如果安全机制存在漏洞，用户可以通过搭建伪造的云控服务器、篡改缓存文件、或者修改客户端代码等方式绕过云控。因此，本方案采用了多层安全防护机制，从传输安全、身份验证、内容完整性、存储安全等多个维度确保配置内容的真实性和不可篡改性。',
    style_body
))

story.append(add_heading('4.1 RSA 签名验证', style_h2, level=1))
story.append(Paragraph(
    '服务端使用 RSA-2048 私钥对配置内容进行签名，客户端使用内置的 RSA 公钥进行验证。签名对象是 config 字段（Base64 编码的原始 YAML 内容）与 configVersion 字段的拼接字符串，签名算法为 SHA256withRSA。客户端在收到云端响应后，首先验证签名——如果签名不匹配，说明配置内容可能被中间人篡改或响应来自伪造的服务器，此时客户端应丢弃该响应并回退到缓存或本地配置。',
    style_body
))
story.append(Paragraph(
    'RSA 公钥采用"分散存储 + 运行时拼接"的方式硬编码在客户端代码中，即将一个完整的公钥字符串拆分为多个片段，分别存放在不同的类文件和代码位置中，运行时通过方法调用将这些片段拼接成完整的公钥。这种方式可以增加逆向分析的难度，使得攻击者不容易通过全局搜索找到完整的公钥。配合代码混淆工具（如 ProGuard 或 Allatori），可以进一步将公钥片段的变量名和方法名打乱，使逆向工程更加困难。',
    style_body
))

story.append(add_heading('4.2 HMAC 请求签名', style_h2, level=1))
story.append(Paragraph(
    '为了防止第三方直接调用云控 API 获取配置内容，客户端在发送请求时需要附带 HMAC-SHA256 签名。签名密钥同样硬编码在客户端代码中（采用分散存储策略），签名内容是对完整的请求 URL（包含所有查询参数）进行 HMAC 计算。服务端使用相同的密钥验证签名，只有签名验证通过的请求才会返回配置数据。这样可以有效防止 API 地址泄露后被第三方滥用，也防止用户通过抓包分析 API 接口后自行构造请求。',
    style_body
))

story.append(add_heading('4.3 本地缓存加密', style_h2, level=1))
story.append(Paragraph(
    '云控配置的本地缓存文件存储在程序目录下的 .mcpatch-cloud-cache 文件中。为了防止用户直接打开和修改缓存文件，缓存内容使用 AES-128 加密存储。加密密钥由客户端内置密钥与 clientId 拼接后进行 SHA-256 哈希生成，确保不同客户端渠道的缓存文件互不通用。缓存文件结构包含：加密后的配置内容、配置版本号、获取时间戳和 AES 初始化向量（IV）。读取缓存时，客户端先解密数据，然后检查配置版本号和获取时间戳，验证缓存的有效性。',
    style_body
))

story.append(add_heading('4.4 时间戳防重放', style_h2, level=1))
story.append(Paragraph(
    '所有请求中包含的 timestamp 参数用于防止重放攻击。服务端收到请求后，会检查 timestamp 与服务器当前时间的差值，如果差值超过 5 分钟（可配置），则拒绝该请求。这样即使攻击者截获了完整的请求（包含 HMAC 签名），也无法在时间窗口之外重放该请求。同时，服务端可以维护一个已使用时间戳的缓存（大小有限，如最近1000个），拒绝处理重复的时间戳，进一步增强防重放能力。',
    style_body
))

story.append(add_heading('4.5 HTTPS 证书锁定', style_h2, level=1))
story.append(Paragraph(
    '云控 API 请求强制使用 HTTPS 协议，并在客户端实现证书锁定（Certificate Pinning）。客户端代码中硬编码了云控服务器 SSL 证书的 SHA-256 指纹，每次建立 HTTPS 连接时都会验证服务器证书的指纹是否与硬编码值匹配。这样即使攻击者能够劫持 DNS 或者使用伪造的 CA 证书，也无法通过证书验证，确保客户端只与真正的云控服务器通信。证书指纹的更新可以通过客户端版本更新来实现。',
    style_body
))

story.append(add_heading('4.6 安全措施总览', style_h2, level=1))
story.append(Spacer(1, 12))
story.append(KeepTogether([
    make_table(
        ['安全措施', '防护目标', '实现方式'],
        [
            ['RSA 签名验证', '防止配置内容被篡改', 'RSA-2048 + SHA256withRSA'],
            ['HMAC 请求签名', '防止 API 被第三方滥用', 'HMAC-SHA256 + 分散密钥存储'],
            ['公钥分散存储', '增加逆向分析难度', '密钥拆分为多片段，运行时拼接'],
            ['本地缓存 AES 加密', '防止用户修改缓存配置', 'AES-128-CBC + 密钥派生'],
            ['时间戳防重放', '防止请求被截获重放', '5分钟时间窗口 + 去重缓存'],
            ['HTTPS 证书锁定', '防止中间人攻击', 'SHA-256 证书指纹验证'],
            ['关键字段白名单合并', '防止注入恶意配置项', '仅合并预定义的安全字段列表'],
        ],
        [0.22, 0.30, 0.48]
    ),
    Paragraph('表6: 安全措施总览', ParagraphStyle(
        name='Caption6', fontName='SarasaMonoSC', fontSize=9, leading=14,
        alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=6, spaceBefore=3
    ))
]))

# ═══════════════════════════════════════════
# 五、客户端实现方案
# ═══════════════════════════════════════════
story.extend(add_major_section('五、客户端实现方案'))

story.append(add_heading('5.1 新增文件清单', style_h2, level=1))
story.append(Paragraph(
    '实现云控功能需要在客户端代码中新增两个类文件，并修改两个现有文件。新增的 CloudConfigService.java 是云控的核心服务类，负责与云端 API 通信、验证签名、合并配置、管理缓存等全部逻辑。新增的 CloudConfigResponse.java 是 API 响应的数据模型类，用于序列化和反序列化 JSON 响应。需要修改的 Main.java 文件中，readConfig() 方法需要加入云控拉取逻辑，在读取本地配置之后判断是否启用云控并进行配置合并。需要修改的 AppConfig.java 文件中，需要新增 5 个云控相关的配置字段及其解析逻辑。',
    style_body
))

story.append(Spacer(1, 12))
story.append(KeepTogether([
    make_table(
        ['文件', '操作', '修改内容'],
        [
            ['CloudConfigService.java', '新建', '云控核心：拉取、验证、合并、缓存'],
            ['CloudConfigResponse.java', '新建', 'API 响应数据模型'],
            ['Main.java', '修改', 'readConfig() 加入云控流程'],
            ['AppConfig.java', '修改', '新增 5 个云控配置字段'],
            ['mcpatch.yml', '修改', 'resources 内置文件新增云控配置段'],
            ['build.gradle.kts', '可选修改', '如需引入 BouncyCastle 等加密库'],
        ],
        [0.30, 0.12, 0.58]
    ),
    Paragraph('表7: 客户端文件修改清单', ParagraphStyle(
        name='Caption7', fontName='SarasaMonoSC', fontSize=9, leading=14,
        alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=6, spaceBefore=3
    ))
]))

story.append(add_heading('5.2 CloudConfigService 核心设计', style_h2, level=1))
story.append(Paragraph(
    'CloudConfigService 是整个云控方案的核心实现类，设计为单例模式，在 Main.AppMain() 的启动流程中创建并使用。该类内部维护一个 OkHttpClient 实例用于 HTTP 通信，以及一组分散存储的密钥片段用于签名和验证。对外提供 fetchAndMergeConfig() 方法，该方法封装了从拉取到合并的完整流程，返回最终合并后的配置 Map，调用方只需将结果传给 AppConfig 构造函数即可。',
    style_body
))
story.append(Paragraph(
    '在错误处理方面，CloudConfigService 实现了三级降级策略：第一级，云端请求成功且签名验证通过，使用云端配置覆盖本地配置；第二级，云端请求失败（网络超时、签名验证失败等），但本地缓存存在且未过期，使用缓存配置；第三级，缓存不存在或已过期，降级使用本地原始配置，同时记录警告日志。在任何情况下，客户端都不会因为云控失败而无法启动（除非云端明确返回 disabled=true）。这种降级策略确保了系统的高可用性，即使在极端网络条件下也能正常工作。',
    style_body
))

story.append(add_heading('5.3 配置合并算法', style_h2, level=1))
story.append(Paragraph(
    '配置合并采用"白名单覆盖"算法，即只覆盖预先定义好的安全敏感字段列表中的字段，其他所有字段保持本地值不变。白名单在代码中以常量数组的形式定义，包含 urls、anti-hotlink-enabled、anti-hotlink-auth-url、anti-hotlink-expire-time、anti-hotlink-uid、cloud-control-enabled、cloud-control-api-url 等字段名。合并时遍历白名单，对于每个字段名，检查云端配置中是否存在该字段，如果存在则用云端值覆盖本地值。',
    style_body
))
story.append(Paragraph(
    '这种白名单机制的好处是：即使管理员在云端配置中不小心加入了恶意字段（例如注入一个特殊的配置项来触发客户端漏洞），客户端也不会接受这些字段，因为它们不在白名单中。白名单本身就是一道安全屏障，限制了云控的可控范围，降低了配置注入的风险。',
    style_body
))

# ═══════════════════════════════════════════
# 六、降级与容错策略
# ═══════════════════════════════════════════
story.extend(add_major_section('六、降级与容错策略'))

story.append(Paragraph(
    '在实际运营环境中，网络问题、服务器故障、DNS 劫持等情况随时可能发生。云控方案必须具备完善的降级和容错策略，确保在各种异常情况下客户端都能正常启动和运行，同时尽可能保持安全级别不降低。',
    style_body
))

story.append(add_heading('6.1 三级降级策略', style_h2, level=1))
story.append(Spacer(1, 12))
story.append(KeepTogether([
    make_table(
        ['级别', '触发条件', '行为', '安全等级'],
        [
            ['L1', '云端请求成功 + 签名验证通过', '使用云端配置覆盖本地', '最高'],
            ['L2', '云端请求失败 + 缓存存在', '使用本地缓存配置', '中等'],
            ['L3', '云端失败 + 无缓存', '使用本地原始配置', '最低'],
        ],
        [0.06, 0.30, 0.34, 0.30]
    ),
    Paragraph('表8: 三级降级策略', ParagraphStyle(
        name='Caption8', fontName='SarasaMonoSC', fontSize=9, leading=14,
        alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=6, spaceBefore=3
    ))
]))

story.append(add_heading('6.2 异常场景处理', style_h2, level=1))
story.append(Paragraph(
    '对于网络超时的情况，客户端使用 httpTimeout 配置值（默认7秒）作为连接超时时间。如果云端 API 在超时时间内没有响应，自动进入 L2 降级使用缓存。对于 DNS 解析失败的情况，OkHttp 会抛出 UnknownHostException，同样进入 L2 降级。对于 HTTPS 证书验证失败的情况，这可能是中间人攻击的迹象，客户端应记录安全告警日志并进入 L2 降级，而不是使用可能是伪造的响应。',
    style_body
))
story.append(Paragraph(
    '对于签名验证失败的情况，说明响应内容被篡改或者来自伪造的服务器，此时客户端应丢弃响应并进入 L2 降级，同时记录详细的安全日志。对于云端返回 disabled=true 的情况，客户端应弹出提示窗口告知用户"该版本已停止维护，请联系管理员获取最新版本"，然后根据 allow-error 配置决定是否继续运行。对于 forceUpdate=true 的情况，客户端应弹出更新提示，建议用户下载最新版本。',
    style_body
))

# ═══════════════════════════════════════════
# 七、管理后台设计
# ═══════════════════════════════════════════
story.extend(add_major_section('七、管理后台设计'))

story.append(Paragraph(
    '管理后台是云控系统的管理端，供管理员编辑和发布配置。后台需要支持以下核心功能：按 clientId 管理不同分发渠道的配置，支持配置的编辑、预览、版本管理和发布回滚。管理员可以通过 Web 界面编辑 mcpatch.yml 的内容，系统自动进行 YAML 语法校验，确保配置格式的正确性。发布时会自动生成配置版本号（基于时间戳）和 RSA 签名，并将配置推送到 API 服务。',
    style_body
))
story.append(Paragraph(
    '后台还需要提供客户端状态监控功能，包括各渠道的请求统计、成功率、配置版本分布等数据。当某个渠道长时间未请求更新（可能意味着该渠道的客户端已停用或被破解）时，后台应发送告警通知。管理员也可以通过后台发送公告通知（notice 字段）或执行紧急操作（如一键禁用某个渠道、强制更新等）。建议后台使用成熟的 Web 框架搭建，配置数据存储在数据库中，API 服务通过读取数据库来响应客户端请求。',
    style_body
))

# ═══════════════════════════════════════════
# 八、实施建议
# ═══════════════════════════════════════════
story.extend(add_major_section('八、实施建议'))

story.append(Paragraph(
    '建议分三个阶段实施云控方案。第一阶段（1-2周）：实现基础的 CloudConfigService 和 API 接口，完成配置拉取、签名验证和合并功能，在测试环境中验证完整流程。第二阶段（1周）：加入缓存加密、HMAC 请求签名、证书锁定等安全增强措施，进行安全测试和渗透测试。第三阶段（1周）：开发管理后台，完成灰度发布流程，先在部分渠道上线验证，确认无问题后全量推送。',
    style_body
))
story.append(Paragraph(
    '在代码混淆方面，建议使用 Allatori 或 ProGuard 对最终的 JAR 文件进行混淆处理，重点混淆 CloudConfigService 中的密钥片段、签名验证逻辑和配置合并白名单。混淆策略应包括：类名和方法名重命名（保持 Main、BalloonUpdateMain 等入口类名不变）、字符串加密（将密钥片段等敏感字符串加密存储，运行时解密）、控制流混淆（将 if-else 逻辑替换为 switch-case 或查表法，增加逆向分析的难度）。配合前面设计的云控方案，即使攻击者成功反编译了混淆后的代码，也很难完整还原签名验证和配置合并的逻辑。',
    style_body
))

# Build
doc.multiBuild(story)
print("PDF generated: " + OUTPUT_PATH)
