// Storybook-style preview of every @healtho/ui primitive in every variant.
//
// Routed at /_design-preview but ONLY resolved on:
//   - local dev (import.meta.env.DEV)
//   - Vercel preview branches (hostname starts with "healtho-git-")
//
// Production hostnames (healtho-kohl.vercel.app and any future custom
// domain) fall through to NotFound. The bundle still contains this
// page's chunk, but it is unreachable from the production UI.

import React, { useState } from 'react';
import {
  Button,
  Card,
  Input,
  Modal,
  Badge,
  IconButton,
  MealAvatar,
  MaterialIcon,
} from '@healtho/ui';

function Section({ title, children, description }) {
  return (
    <section className="border border-slate-800 rounded-2xl bg-slate-900/40 p-6 md:p-8">
      <header className="mb-6">
        <h2 className="text-xl font-bold text-white font-display">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-400 font-display">{description}</p>
        )}
      </header>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
      <div className="text-[11px] font-semibold tracking-[0.1em] uppercase text-slate-500 md:w-32 shrink-0">
        {label}
      </div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

export default function DesignPreview() {
  const [modalOpen, setModalOpen] = useState(false);
  const [titledModalOpen, setTitledModalOpen] = useState(false);
  const [emailValue, setEmailValue] = useState('');

  return (
    <div className="min-h-screen bg-background-dark text-white pb-24">
      <header className="border-b border-slate-800 bg-slate-900/30 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <p className="eyebrow">@healtho/ui &middot; phase 2 preview</p>
          <h1 className="h1 mt-2">Primitives</h1>
          <p className="body mt-3 max-w-2xl">
            Every primitive in every variant. Visual reference for the design system
            migration. This page is not reachable on production.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 flex flex-col gap-10">
        <Section
          title="Button"
          description="Three variants × three sizes. Reads --btn-h-* and --tap-ring from tokens."
        >
          <Row label="primary">
            <Button size="sm">Small</Button>
            <Button size="md">Continue</Button>
            <Button size="lg">Start your journey</Button>
          </Row>
          <Row label="secondary">
            <Button variant="secondary" size="sm">Small</Button>
            <Button variant="secondary" size="md">Continue</Button>
            <Button variant="secondary" size="lg">Read more</Button>
          </Row>
          <Row label="ghost">
            <Button variant="ghost" size="sm">Small</Button>
            <Button variant="ghost" size="md">Log In</Button>
            <Button variant="ghost" size="lg">Maybe later</Button>
          </Row>
          <Row label="disabled">
            <Button disabled>Saving…</Button>
            <Button variant="secondary" disabled>Disabled</Button>
            <Button variant="ghost" disabled>Disabled</Button>
          </Row>
          <Row label="as link">
            <Button as="a" href="#" variant="primary" size="md">
              Anchor styled as button
            </Button>
          </Row>
        </Section>

        <Section
          title="Card"
          description="Slate-900 surface with hairline border. Optional decorative corner glow."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <p className="label mb-2">default</p>
              <p className="body">Hairline-bordered card. Container for any content.</p>
            </Card>
            <Card variant="elevated">
              <p className="label mb-2">elevated</p>
              <p className="body">Same surface plus the lifted card shadow.</p>
            </Card>
            <Card glow>
              <p className="label mb-2">with glow</p>
              <p className="body">Decorative purple blob in the top-right corner.</p>
            </Card>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Card padding="sm" className="text-center">
              <p className="label-xs">padding sm</p>
            </Card>
            <Card padding="md" className="text-center">
              <p className="label-xs">padding md</p>
            </Card>
            <Card padding="lg" className="text-center">
              <p className="label-xs">padding lg</p>
            </Card>
          </div>
        </Section>

        <Section
          title="Input"
          description="Slate-900 surface with focus ring driven by the brand color. --input-h drives height (44 web, 52 mobile)."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <Input label="Email" icon="mail" placeholder="you@example.com" type="email"
              value={emailValue} onChange={(e) => setEmailValue(e.target.value)} />
            <Input label="Password" icon="lock" type="password" placeholder="Enter your password" />
            <Input label="Height" icon="height" type="number" placeholder="175" suffix="cm" />
            <Input label="Weight" icon="monitor_weight" type="number" placeholder="70" suffix="kg" />
            <Input placeholder="Without label" />
            <Input
              label="Search"
              icon="search"
              placeholder="Find a food…"
              right={<IconButton icon="tune" size="sm" variant="plain" aria-label="Filters" />}
            />
          </div>
        </Section>

        <Section title="Badge" description="Five variants, optional leading icon.">
          <Row label="gradient">
            <Badge variant="gradient">Most Popular</Badge>
          </Row>
          <Row label="pop">
            <Badge variant="pop" icon="bolt">Pro</Badge>
            <Badge variant="pop">Now Available for Web</Badge>
          </Row>
          <Row label="ok">
            <Badge variant="ok" icon="check_circle">Healthy weight</Badge>
            <Badge variant="ok">On track</Badge>
          </Row>
          <Row label="warn">
            <Badge variant="warn">Overweight</Badge>
            <Badge variant="warn" icon="warning">Over goal</Badge>
          </Row>
          <Row label="soft">
            <Badge>120 kcal</Badge>
            <Badge>170g</Badge>
            <Badge icon="schedule">Today</Badge>
          </Row>
        </Section>

        <Section title="IconButton" description="Three sizes, three variants. Always supply aria-label.">
          <Row label="ghost">
            <IconButton icon="settings" size="sm" aria-label="Settings" />
            <IconButton icon="settings" size="md" aria-label="Settings" />
            <IconButton icon="settings" size="lg" aria-label="Settings" />
          </Row>
          <Row label="primary">
            <IconButton icon="add" size="sm" variant="primary" aria-label="Add" />
            <IconButton icon="add" size="md" variant="primary" aria-label="Add" />
            <IconButton icon="add" size="lg" variant="primary" aria-label="Add" />
          </Row>
          <Row label="plain">
            <IconButton icon="close" size="sm" variant="plain" aria-label="Close" />
            <IconButton icon="close" size="md" variant="plain" aria-label="Close" />
            <IconButton icon="close" size="lg" variant="plain" aria-label="Close" />
          </Row>
        </Section>

        <Section title="MealAvatar" description="Emoji-only contexts: meal types and activity-level pickers.">
          <Row label="default 40">
            <MealAvatar emoji="🍳" />
            <MealAvatar emoji="🥗" />
            <MealAvatar emoji="🍽️" />
            <MealAvatar emoji="🍎" />
          </Row>
          <Row label="activity 56">
            <MealAvatar emoji="🪑" size={56} />
            <MealAvatar emoji="🚶" size={56} />
            <MealAvatar emoji="🏃" size={56} />
            <MealAvatar emoji="💪" size={56} />
            <MealAvatar emoji="🏋️" size={56} />
          </Row>
          <Row label="gradient">
            <MealAvatar size={64} variant="gradient">
              <MaterialIcon name="local_fire_department" size={28} />
            </MealAvatar>
            <MealAvatar size={64} variant="gradient">
              <MaterialIcon name="emoji_events" size={28} />
            </MealAvatar>
          </Row>
        </Section>

        <Section title="MaterialIcon" description="Outlined symbols, FILL & wght axes accessible via props.">
          <Row label="size">
            <MaterialIcon name="favorite" size={16} />
            <MaterialIcon name="favorite" size={20} />
            <MaterialIcon name="favorite" size={24} />
            <MaterialIcon name="favorite" size={32} />
            <MaterialIcon name="favorite" size={48} />
          </Row>
          <Row label="fill">
            <MaterialIcon name="favorite" size={32} fill={0} />
            <MaterialIcon name="favorite" size={32} fill={1} />
          </Row>
          <Row label="weight">
            <MaterialIcon name="bolt" size={32} weight={100} />
            <MaterialIcon name="bolt" size={32} weight={400} />
            <MaterialIcon name="bolt" size={32} weight={700} />
          </Row>
          <Row label="color">
            <MaterialIcon name="water_drop" size={28} className="text-water" />
            <MaterialIcon name="local_fire_department" size={28} className="text-primary" />
            <MaterialIcon name="restaurant" size={28} className="text-carbs" />
          </Row>
        </Section>

        <Section title="Modal" description="Web centered modal. ESC, click-outside, body-scroll lock, portal.">
          <Row label="open">
            <Button onClick={() => setModalOpen(true)}>Open untitled modal</Button>
            <Button variant="secondary" onClick={() => setTitledModalOpen(true)}>
              Open titled modal
            </Button>
          </Row>
        </Section>
      </main>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        ariaLabel="Untitled preview modal"
      >
        <p className="body">
          This modal has no title bar — useful when the body is fully self-explanatory
          (e.g. a single celebration moment).
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Dismiss</Button>
          <Button onClick={() => setModalOpen(false)}>OK</Button>
        </div>
      </Modal>

      <Modal
        open={titledModalOpen}
        onClose={() => setTitledModalOpen(false)}
        title="Daily goal met!"
      >
        <p className="body">
          You hit 1,847 calories with 32g protein, 48g carbs, and 21g fat. Keep it going.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setTitledModalOpen(false)}>Close</Button>
          <Button onClick={() => setTitledModalOpen(false)}>View summary</Button>
        </div>
      </Modal>
    </div>
  );
}
