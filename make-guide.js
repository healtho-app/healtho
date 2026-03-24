const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, HeadingLevel,
  ExternalHyperlink, LevelFormat, VerticalAlign
} = require('docx')
const fs = require('fs')

// ── Colours ───────────────────────────────────────────────────────────────────
const BLUE   = '137fec'
const DARK   = '1e293b'
const LIGHT  = 'f0f7ff'
const WHITE  = 'FFFFFF'
const GRAY   = '64748b'
const GREEN  = '16a34a'
const BORDER = { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' }
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER }
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER }

// ── Helpers ───────────────────────────────────────────────────────────────────
const sp = (before = 0, after = 0) => ({ before, after })
const gap = (n = 160) => new Paragraph({ children: [new TextRun('')], spacing: sp(0, n) })

function heading(text, level = 1) {
  const sizes = { 1: 32, 2: 26, 3: 22 }
  const colors = { 1: BLUE, 2: DARK, 3: DARK }
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: sizes[level], color: colors[level], font: 'Arial' })],
    spacing: sp(level === 1 ? 320 : 240, 120),
  })
}

function body(text, { bold = false, color = '334155', size = 22, indent = 0 } = {}) {
  return new Paragraph({
    children: [new TextRun({ text, bold, color, size, font: 'Arial' })],
    spacing: sp(0, 80),
    indent: indent ? { left: indent } : undefined,
  })
}

function link(label, url) {
  return new Paragraph({
    children: [
      new ExternalHyperlink({
        link: url,
        children: [new TextRun({ text: label, color: BLUE, underline: {}, size: 22, font: 'Arial' })]
      })
    ],
    spacing: sp(0, 80),
  })
}

function step(num, title, description) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [720, 8640],
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          // Circle number
          new TableCell({
            borders: NO_BORDERS,
            width: { size: 720, type: WidthType.DXA },
            verticalAlign: VerticalAlign.TOP,
            margins: { top: 60, bottom: 60, left: 0, right: 120 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: String(num), bold: true, color: WHITE, size: 20, font: 'Arial' })],
              shading: { fill: BLUE, type: ShadingType.CLEAR },
            })]
          }),
          // Content
          new TableCell({
            borders: NO_BORDERS,
            width: { size: 8640, type: WidthType.DXA },
            margins: { top: 40, bottom: 60, left: 120, right: 0 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: title, bold: true, size: 23, color: '1e293b', font: 'Arial' })],
                spacing: sp(0, 60),
              }),
              new Paragraph({
                children: [new TextRun({ text: description, size: 21, color: GRAY, font: 'Arial' })],
                spacing: sp(0, 0),
              }),
            ]
          })
        ]
      })
    ]
  })
}

function pageCard(route, name, desc) {
  return new TableRow({
    children: [
      new TableCell({
        borders: BORDERS,
        width: { size: 2400, type: WidthType.DXA },
        shading: { fill: LIGHT, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
        children: [new Paragraph({
          children: [new TextRun({ text: route, bold: true, size: 20, color: BLUE, font: 'Courier New' })]
        })]
      }),
      new TableCell({
        borders: BORDERS,
        width: { size: 2160, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
        children: [new Paragraph({
          children: [new TextRun({ text: name, bold: true, size: 20, color: '1e293b', font: 'Arial' })]
        })]
      }),
      new TableCell({
        borders: BORDERS,
        width: { size: 4800, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
        children: [new Paragraph({
          children: [new TextRun({ text: desc, size: 20, color: GRAY, font: 'Arial' })]
        })]
      }),
    ]
  })
}

function infoBox(text) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({
      children: [new TableCell({
        borders: {
          top:    { style: BorderStyle.SINGLE, size: 2, color: BLUE },
          bottom: { style: BorderStyle.SINGLE, size: 2, color: BLUE },
          left:   { style: BorderStyle.SINGLE, size: 12, color: BLUE },
          right:  { style: BorderStyle.SINGLE, size: 2, color: BLUE },
        },
        shading: { fill: LIGHT, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 200, right: 200 },
        children: [new Paragraph({
          children: [new TextRun({ text, size: 21, color: '1e293b', font: 'Arial' })],
        })]
      })]
    })]
  })
}

// ── Build Document ────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '\u2022',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 560, hanging: 280 } } }
        }]
      }
    ]
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } }
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
      }
    },
    children: [

      // ── Header Banner ──
      new Table({
        width: { size: 10080, type: WidthType.DXA },
        columnWidths: [10080],
        rows: [new TableRow({
          children: [new TableCell({
            shading: { fill: '0f172a', type: ShadingType.CLEAR },
            borders: NO_BORDERS,
            margins: { top: 320, bottom: 320, left: 400, right: 400 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Healtho 🍎', bold: true, size: 52, color: WHITE, font: 'Arial' })],
                spacing: sp(0, 80),
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Family Health & Nutrition Companion', size: 24, color: 'cbd5e1', font: 'Arial' })],
                spacing: sp(0, 120),
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'How to View the App — Quick Guide for the Family', size: 21, color: '94a3b8', font: 'Arial' })],
              }),
            ]
          })]
        })]
      }),

      gap(240),

      // ── Intro ──
      body("Hi everyone! Ayush here. I've been building the Healtho website — our family's health and nutrition tracker. The app is now live online and you can view it from any device. Here's how:", { size: 23, color: '334155' }),

      gap(200),

      // ── Section 1: Live Link ──
      heading('Step 1 — Open the Live App'),
      infoBox('Open any web browser (Chrome, Safari, Firefox, Edge) and go to this link:'),
      gap(120),

      new Table({
        width: { size: 10080, type: WidthType.DXA },
        columnWidths: [10080],
        rows: [new TableRow({
          children: [new TableCell({
            shading: { fill: LIGHT, type: ShadingType.CLEAR },
            borders: {
              top:    { style: BorderStyle.SINGLE, size: 6, color: BLUE },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE },
              left:   { style: BorderStyle.SINGLE, size: 6, color: BLUE },
              right:  { style: BorderStyle.SINGLE, size: 6, color: BLUE },
            },
            margins: { top: 180, bottom: 180, left: 300, right: 300 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ExternalHyperlink({
                    link: 'https://healtho-git-main-ayushkapoor11s-projects.vercel.app',
                    children: [new TextRun({
                      text: 'https://healtho-git-main-ayushkapoor11s-projects.vercel.app',
                      bold: true, size: 22, color: BLUE, underline: {}, font: 'Courier New'
                    })]
                  })
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Click the link above or copy-paste it into your browser', size: 19, color: GRAY, font: 'Arial' })],
                spacing: sp(60, 0),
              }),
            ]
          })]
        })]
      }),

      gap(200),

      // ── Section 2: What you'll see ──
      heading("Step 2 — What You'll See"),
      body("The app has 5 screens. You can navigate between them using the buttons on each page:", { color: GRAY }),
      gap(120),

      new Table({
        width: { size: 10080, type: WidthType.DXA },
        columnWidths: [2400, 2160, 4800],
        rows: [
          // Header row
          new TableRow({
            children: [
              new TableCell({
                borders: BORDERS,
                shading: { fill: '0f172a', type: ShadingType.CLEAR },
                width: { size: 2400, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 140, right: 140 },
                children: [new Paragraph({ children: [new TextRun({ text: 'URL', bold: true, size: 20, color: WHITE, font: 'Arial' })] })]
              }),
              new TableCell({
                borders: BORDERS,
                shading: { fill: '0f172a', type: ShadingType.CLEAR },
                width: { size: 2160, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 140, right: 140 },
                children: [new Paragraph({ children: [new TextRun({ text: 'Page', bold: true, size: 20, color: WHITE, font: 'Arial' })] })]
              }),
              new TableCell({
                borders: BORDERS,
                shading: { fill: '0f172a', type: ShadingType.CLEAR },
                width: { size: 4800, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 140, right: 140 },
                children: [new Paragraph({ children: [new TextRun({ text: 'What it shows', bold: true, size: 20, color: WHITE, font: 'Arial' })] })]
              }),
            ]
          }),
          pageCard('/login',     'Login',        'Sign in with email and password'),
          pageCard('/register',  'Register',     '3-step sign-up: account → body stats → activity level'),
          pageCard('/profile',   'Profile',      'Your BMI, calorie goal, and health summary'),
          pageCard('/dashboard', 'Dashboard',    'Daily calorie ring, macros, water, meals, and streak'),
          pageCard('/*',        '404 Page',     'Friendly error if you go to a page that doesn\'t exist'),
        ]
      }),

      gap(200),

      // ── Section 3: How to navigate ──
      heading('Step 3 — Try It Out'),
      body('Here\'s the recommended flow to explore the full app:', { color: GRAY }),
      gap(120),

      step(1, 'Go to the Register page', 'Fill in your name, email, and a password. Click Continue.'),
      gap(100),
      step(2, 'Enter your body metrics', 'Add your age, height, and weight. Watch the live BMI calculator update in real time!'),
      gap(100),
      step(3, 'Pick your activity level', 'Choose the option that best matches your lifestyle, then click Create My Account.'),
      gap(100),
      step(4, 'See your Profile', 'Your BMI category and personalised daily calorie goal will be displayed.'),
      gap(100),
      step(5, 'Explore the Dashboard', 'Click "Go to my Dashboard" to see the full nutrition tracker — calorie ring, macros, water, and meals.'),

      gap(200),

      // ── Note box ──
      infoBox('Note: The app is in early development. The data shown on the Dashboard is placeholder data for now. Real meal logging and Supabase database connection are coming soon — Ishaan is working on the backend!'),

      gap(200),

      // ── UI Demos ──
      heading('Bonus — HTML Mockups (GitHub Pages)'),
      body('We also have static HTML preview pages hosted on GitHub Pages. These are early design mockups — the React app above is the real thing, but these are useful for quick visual reference:', { color: GRAY }),
      gap(120),

      ...[
        ['Dashboard mockup', 'https://healtho-app.github.io/healtho/frontend/ui-demos/healtho-dashboard.html'],
        ['Register mockup',  'https://healtho-app.github.io/healtho/frontend/ui-demos/healtho-register.html'],
        ['Profile mockup',   'https://healtho-app.github.io/healtho/frontend/ui-demos/healtho-profile.html'],
      ].map(([label, url]) => new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        spacing: sp(0, 80),
        children: [
          new TextRun({ text: `${label}: `, bold: true, size: 21, color: '334155', font: 'Arial' }),
          new ExternalHyperlink({
            link: url,
            children: [new TextRun({ text: url, size: 20, color: BLUE, underline: {}, font: 'Courier New' })]
          })
        ]
      })),

      gap(200),

      // ── GitHub ──
      heading('Source Code — GitHub'),
      body('All the code lives here. You can see exactly what has been built, the commit history, and the project README:', { color: GRAY }),
      gap(80),
      link('https://github.com/healtho-app/healtho', 'https://github.com/healtho-app/healtho'),

      gap(200),

      // ── Footer banner ──
      new Table({
        width: { size: 10080, type: WidthType.DXA },
        columnWidths: [10080],
        rows: [new TableRow({
          children: [new TableCell({
            shading: { fill: LIGHT, type: ShadingType.CLEAR },
            borders: {
              top:    { style: BorderStyle.SINGLE, size: 6, color: BLUE },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' },
              left:   { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' },
              right:  { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' },
            },
            margins: { top: 200, bottom: 200, left: 300, right: 300 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Built with care by Ayush  \u2014  Frontend & Mobile', size: 21, color: '475569', font: 'Arial' })],
                spacing: sp(0, 60),
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Questions? Message me on WhatsApp or email me directly.', size: 20, color: GRAY, font: 'Arial' })],
                spacing: sp(0, 60),
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: '\u00A9 2025 Healtho. All rights reserved.', size: 18, color: '94a3b8', font: 'Arial' })],
              }),
            ]
          })]
        })]
      }),
    ]
  }]
})

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('Healtho_Family_Guide.docx', buf)
  console.log('Done! Healtho_Family_Guide.docx created.')
})
