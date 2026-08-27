import { Check, Cloud, Cpu, HardDrive, Laptop, Server } from "lucide-react";
import Link from "next/link";
import { docsPath } from "@/lib/docs-version";

/**
 * What Ryu runs, connects to, and runs on, plus what of it is open.
 *
 * This content used to sit on the marketing landing page. It moved here rather
 * than being dropped, because it is Motion A material: model counts, MCP, agent
 * runtimes, SPDX licences and self-host targets are what a developer evaluating
 * the project wants, and the business site is written for a partner at a firm
 * who has no use for any of it.
 *
 * Ported natively rather than imported. `apps/fumadocs` deliberately carries no
 * `@ryu/*` dependency. Even the logo is re-implemented locally, so these are
 * plain fumadocs components on `fd-*` tokens, and the logo SVGs are vendored
 * into this app's own `public/logos`.
 */

const REACH: { label: string; value: string }[] = [
	{ value: "900k", label: "skills in the catalog" },
	{ value: "400+", label: "models available" },
	{ value: "250+", label: "MCP tools" },
	{ value: "2.8M+", label: "local models in Hugging Face" },
];

const AGENTS: { logo?: string; name: string }[] = [
	{ name: "Claude Code", logo: "claude" },
	{ name: "Codex", logo: "codex" },
	{ name: "Gemini", logo: "gemini" },
	{ name: "Cursor", logo: "cursor" },
	{ name: "OpenAI", logo: "openai" },
	{ name: "OpenClaw", logo: "openclaw" },
	{ name: "Ollama", logo: "ollama" },
	{ name: "Hermes" },
	{ name: "Pi" },
];

const INTEGRATIONS: { logo: string; logoDark?: string; mono?: boolean; name: string }[] =
	[
		{ name: "Slack", logo: "slack" },
		{ name: "Notion", logo: "notion" },
		{ name: "Stripe", logo: "stripe" },
		{ name: "GitHub", logo: "github_light", logoDark: "github_dark" },
		{ name: "Google", logo: "google", mono: true },
		{ name: "Dropbox", logo: "dropbox" },
		{ name: "Figma", logo: "figma" },
		{ name: "Zoom", logo: "zoom" },
		{ name: "Asana", logo: "asana-logo" },
		{ name: "Cloudflare", logo: "cloudflare" },
		{ name: "Linear", logo: "linear", mono: true },
		{ name: "Vercel", logo: "vercel", mono: true },
	];

const OPEN_UNITS: { license: string; name: string }[] = [
	{ name: "Core", license: "Apache-2.0" },
	{ name: "Gateway", license: "AGPL-3.0" },
	{ name: "SDK", license: "Apache-2.0" },
	{ name: "CLI", license: "Apache-2.0" },
];

const OPEN_POINTS = [
	"Self-host Core and Gateway.",
	"Use any OpenAI-compatible client.",
	"Inspect routing, firewall, budgets, and tool allowlists.",
	"Bring your own agent, keys, and models.",
];

const PLACES: { Icon: typeof Laptop; note: string; place: string }[] = [
	{ Icon: Laptop, place: "Your laptop", note: "Keep sensitive work local." },
	{
		Icon: HardDrive,
		place: "Mac mini",
		note: "Run background work on a private node.",
	},
	{ Icon: Cpu, place: "Raspberry Pi", note: "Run lightweight always-on tasks." },
	{
		Icon: Server,
		place: "Home server",
		note: "Run jobs on your own network.",
	},
	{ Icon: Cloud, place: "Cloud", note: "Use managed cloud for shared workloads." },
];

/**
 * Agent marks are drawn as a MASK filled with the foreground colour rather than
 * as an `img`. They are a mixed bag of colour and flat-black SVGs, and the flat
 * ones (Cursor, Codex) vanish against a dark background when rendered as-is.
 */
function maskStyle(logo: string): React.CSSProperties {
	const url = `url(/logos/${logo}.svg)`;
	return {
		maskImage: url,
		WebkitMaskImage: url,
		maskRepeat: "no-repeat",
		WebkitMaskRepeat: "no-repeat",
		maskPosition: "center",
		WebkitMaskPosition: "center",
		maskSize: "contain",
		WebkitMaskSize: "contain",
	};
}

function SectionShell({
	children,
	description,
	id,
	title,
}: {
	children: React.ReactNode;
	description: string;
	id: string;
	title: string;
}) {
	return (
		<section
			aria-labelledby={`${id}-heading`}
			className="mx-auto w-full max-w-4xl px-4 py-12"
		>
			<h2
				className="font-heading font-medium text-fd-foreground text-xl"
				id={`${id}-heading`}
			>
				{title}
			</h2>
			<p className="mt-1 text-fd-muted-foreground text-sm">{description}</p>
			<div className="mt-6">{children}</div>
		</section>
	);
}

export function Reach() {
	return (
		<SectionShell
			description="Start with Ryu's built-in skills, models, and MCP tools."
			id="reach"
			title="Built-in access"
		>
			<dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				{REACH.map((stat) => (
					<div className="rounded-xl bg-fd-secondary p-4" key={stat.label}>
						<dt className="font-heading font-medium text-2xl text-fd-foreground tabular-nums">
							{stat.value}
						</dt>
						<dd className="mt-1 text-fd-muted-foreground text-sm leading-snug">
							{stat.label}
						</dd>
					</div>
				))}
			</dl>
		</SectionShell>
	);
}

export function WorksWith() {
	return (
		<SectionShell
			description="Ryu runs alongside the agents you already use."
			id="agents"
			title="Agents and runtimes"
		>
			<ul className="flex flex-wrap gap-2">
				{AGENTS.map((agent) => (
					<li
						className="inline-flex items-center gap-2 rounded-full bg-fd-secondary px-4 py-2 text-fd-foreground text-sm"
						key={agent.name}
					>
						{agent.logo ? (
							<span
								aria-hidden="true"
								className="size-4 shrink-0 bg-fd-foreground/70"
								style={maskStyle(agent.logo)}
							/>
						) : null}
						{agent.name}
					</li>
				))}
			</ul>
		</SectionShell>
	);
}

export function Integrations() {
	return (
		<SectionShell
			description="Connect agents to the tools your product already uses."
			id="integrations"
			title="Tools and integrations"
		>
			<ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
				{INTEGRATIONS.map((tool) => (
					<li
						className="flex h-16 items-center justify-center rounded-xl bg-fd-secondary px-3"
						key={tool.name}
					>
						{tool.logoDark ? (
							<>
								{/* biome-ignore lint/performance/noImgElement: static vendored SVG */}
								<img
									alt={tool.name}
									className="h-5 w-auto max-w-[6rem] object-contain dark:hidden"
									height={20}
									loading="lazy"
									src={`/logos/${tool.logo}.svg`}
									width={96}
								/>
								{/* biome-ignore lint/performance/noImgElement: static vendored SVG */}
								<img
									alt=""
									aria-hidden="true"
									className="hidden h-5 w-auto max-w-[6rem] object-contain dark:block"
									height={20}
									loading="lazy"
									src={`/logos/${tool.logoDark}.svg`}
									width={96}
								/>
							</>
						) : (
							// biome-ignore lint/performance/noImgElement: static vendored SVG
							<img
								alt={tool.name}
								className={`h-5 w-auto max-w-[6rem] object-contain${tool.mono ? " brightness-0 dark:invert" : ""}`}
								height={20}
								loading="lazy"
								src={`/logos/${tool.logo}.svg`}
								width={96}
							/>
						)}
					</li>
				))}
			</ul>
		</SectionShell>
	);
}

export function OpenSource() {
	return (
		<SectionShell
			description="Core, Gateway, SDK, and CLI are open and self-hostable."
			id="open-source"
			title="Open core"
		>
			<div className="grid gap-6 md:grid-cols-2">
				<ul className="space-y-2">
					{OPEN_UNITS.map((unit) => (
						<li
							className="flex items-center justify-between rounded-xl bg-fd-secondary px-4 py-3"
							key={unit.name}
						>
							<span className="font-medium text-fd-foreground text-sm">
								{unit.name}
							</span>
							<span className="font-mono text-fd-muted-foreground text-xs">
								{unit.license}
							</span>
						</li>
					))}
				</ul>
				<ul className="space-y-3">
					{OPEN_POINTS.map((point) => (
						<li className="flex items-start gap-2.5" key={point}>
							<Check
								aria-hidden="true"
								className="mt-0.5 size-4 shrink-0 text-fd-muted-foreground"
							/>
							<span className="text-fd-muted-foreground text-sm leading-relaxed">
								{point}
							</span>
						</li>
					))}
				</ul>
			</div>
		</SectionShell>
	);
}

export function RunItAnywhere() {
	return (
		<SectionShell
			description="Run Ryu locally, on your own server, or in the cloud."
			id="run-anywhere"
			title="Run Ryu anywhere"
		>
			<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{PLACES.map((place) => (
					<li
						className="flex items-start gap-3 rounded-xl bg-fd-secondary p-4"
						key={place.place}
					>
						<place.Icon
							aria-hidden="true"
							className="mt-0.5 size-5 shrink-0 text-fd-muted-foreground"
						/>
						<div>
							<p className="font-medium text-fd-foreground text-sm">
								{place.place}
							</p>
							<p className="mt-0.5 text-fd-muted-foreground text-sm">
								{place.note}
							</p>
						</div>
					</li>
				))}
			</ul>
			<p className="mt-6 text-fd-muted-foreground text-sm">
				See the{" "}
				<Link
					className="text-fd-foreground underline underline-offset-4"
					href={docsPath("start-here", "architecture")}
				>
					architecture guide
				</Link>
				{" "}for the request path through the Gateway, Core, and an engine.
			</p>
		</SectionShell>
	);
}
