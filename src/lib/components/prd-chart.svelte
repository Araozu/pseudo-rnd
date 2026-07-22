<script lang="ts">
	import { scaleLinear } from 'd3-scale';
	import { curveMonotoneX, line } from 'd3-shape';
	import * as Chart from '$lib/components/ui/chart';
	import type { PrdRow } from '$lib/prd';

	type Props = {
		rows: PrdRow[];
		highlightedAttempt?: number | null;
		onhighlight?: (attempt: number | null) => void;
	};

	let { rows, highlightedAttempt = $bindable(null), onhighlight }: Props = $props();

	const padding = { top: 24, right: 24, bottom: 42, left: 56 };
	const yTicks = [0, 0.25, 0.5, 0.75, 1];
	const chartConfig = {
		conditionalChance: { label: 'Next chance', color: 'var(--chart-3)' },
		exactChance: { label: 'Proc here', color: 'var(--chart-2)' },
		cumulativeChance: { label: 'Proc by now', color: 'var(--foreground)' }
	} satisfies Chart.ChartConfig;

	let chartWidth = $state(720);
	let chartHeight = $state(520);
	let maxAttempt = $derived(rows.at(-1)?.attempt ?? 1);
	let plotWidth = $derived(Math.max(1, chartWidth - padding.left - padding.right));
	let plotHeight = $derived(Math.max(1, chartHeight - padding.top - padding.bottom));
	let xScale = $derived(
		scaleLinear()
			.domain([1, Math.max(2, maxAttempt)])
			.range([padding.left, padding.left + plotWidth])
	);
	let yScale = $derived(
		scaleLinear()
			.domain([0, 1])
			.range([padding.top + plotHeight, padding.top])
	);

	let xTicks = $derived.by(() => {
		const suggestedTicks = xScale.ticks(Math.max(2, Math.floor(plotWidth / 90))).map(Math.round);
		return [...new Set([1, ...suggestedTicks, maxAttempt])]
			.filter((attempt) => attempt >= 1 && attempt <= maxAttempt)
			.sort((a, b) => a - b);
	});

	let paths = $derived.by(() => {
		const createPath = (accessor: (row: PrdRow) => number) =>
			line<PrdRow>()
				.x((row) => xScale(row.attempt))
				.y((row) => yScale(accessor(row)))
				.curve(curveMonotoneX)(rows) ?? '';

		return {
			conditionalChance: createPath((row) => row.conditionalChance),
			exactChance: createPath((row) => row.exactChance),
			cumulativeChance: createPath((row) => row.cumulativeChance)
		};
	});

	let highlightedRow = $derived(
		highlightedAttempt === null ? null : (rows[highlightedAttempt - 1] ?? null)
	);

	const percentFormatter = new Intl.NumberFormat('en-US', {
		style: 'percent',
		minimumFractionDigits: 2,
		maximumFractionDigits: 4
	});

	function setHighlight(attempt: number | null) {
		if (highlightedAttempt === attempt) return;
		highlightedAttempt = attempt;
		onhighlight?.(attempt);
	}

	function handlePointerMove(event: PointerEvent) {
		const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const pointerX = ((event.clientX - bounds.left) / bounds.width) * chartWidth;
		const attempt = Math.max(1, Math.min(maxAttempt, Math.round(xScale.invert(pointerX))));
		setHighlight(attempt);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
		event.preventDefault();

		const direction = event.key === 'ArrowRight' ? 1 : -1;
		const currentAttempt = highlightedAttempt ?? 1;
		setHighlight(Math.max(1, Math.min(maxAttempt, currentAttempt + direction)));
	}
</script>

<Chart.Container
	config={chartConfig}
	class="relative aspect-auto h-full min-h-96 w-full items-stretch justify-stretch overflow-hidden"
>
	<div class="relative size-full" bind:clientWidth={chartWidth} bind:clientHeight={chartHeight}>
		<svg
			width={chartWidth}
			height={chartHeight}
			class="block size-full"
			role="img"
			aria-label="Probability growth chart. Use the left and right arrow keys to inspect attempts."
		>
			<title>Next chance, proc here, and cumulative proc chance by attempt</title>
			<rect width={chartWidth} height={chartHeight} fill="transparent" />

			{#each yTicks as tick (tick)}
				{@const y = yScale(tick)}
				<line
					x1={padding.left}
					x2={chartWidth - padding.right}
					y1={y}
					y2={y}
					class="stroke-border"
					stroke-width="1"
				/>
				<text
					x={padding.left - 10}
					y={y + 4}
					text-anchor="end"
					class="fill-muted-foreground text-[11px] tabular-nums"
				>
					{Math.round(tick * 100)}%
				</text>
			{/each}

			{#each xTicks as tick (tick)}
				{@const x = xScale(tick)}
				<line
					x1={x}
					x2={x}
					y1={padding.top}
					y2={chartHeight - padding.bottom}
					class="stroke-border/40"
					stroke-width="1"
				/>
				<text
					{x}
					y={chartHeight - 14}
					text-anchor="middle"
					class="fill-muted-foreground text-[11px] tabular-nums"
				>
					{tick}
				</text>
			{/each}

			<text
				x={padding.left + plotWidth / 2}
				y={chartHeight - 1}
				text-anchor="middle"
				class="fill-muted-foreground text-[11px]"
			>
				Attempt
			</text>

			<path
				d={paths.conditionalChance}
				fill="none"
				stroke="var(--color-conditionalChance)"
				stroke-width="2"
				stroke-dasharray="7 5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<path
				d={paths.exactChance}
				fill="none"
				stroke="var(--color-exactChance)"
				stroke-width="2"
				stroke-dasharray="2 5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<path
				d={paths.cumulativeChance}
				fill="none"
				stroke="var(--color-cumulativeChance)"
				stroke-width="3"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>

			{#if highlightedRow}
				{@const highlightX = xScale(highlightedRow.attempt)}
				<line
					x1={highlightX}
					x2={highlightX}
					y1={padding.top}
					y2={chartHeight - padding.bottom}
					class="stroke-foreground/40"
					stroke-width="1"
				/>
				<circle
					cx={highlightX}
					cy={yScale(highlightedRow.conditionalChance)}
					r="4"
					fill="var(--color-conditionalChance)"
					class="stroke-background"
					stroke-width="2"
				/>
				<circle
					cx={highlightX}
					cy={yScale(highlightedRow.exactChance)}
					r="4"
					fill="var(--color-exactChance)"
					class="stroke-background"
					stroke-width="2"
				/>
				<circle
					cx={highlightX}
					cy={yScale(highlightedRow.cumulativeChance)}
					r="5"
					fill="var(--color-cumulativeChance)"
					class="stroke-background"
					stroke-width="2"
				/>
			{/if}
		</svg>
		<button
			type="button"
			class="absolute inset-0 cursor-crosshair bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
			aria-label="Inspect probability metrics by attempt. Use the left and right arrow keys to move."
			onpointermove={handlePointerMove}
			onpointerleave={() => setHighlight(null)}
			onkeydown={handleKeydown}
			onblur={() => setHighlight(null)}
		></button>

		{#if highlightedRow}
			<div
				class="pointer-events-none absolute top-3 left-16 min-w-44 rounded-lg border bg-background/95 p-3 text-xs shadow-sm backdrop-blur-sm"
			>
				<div class="mb-2 font-medium">Attempt {highlightedRow.attempt}</div>
				<dl class="space-y-1.5 tabular-nums">
					<div class="flex items-center justify-between gap-5">
						<dt class="text-muted-foreground">Next chance</dt>
						<dd>{percentFormatter.format(highlightedRow.conditionalChance)}</dd>
					</div>
					<div class="flex items-center justify-between gap-5">
						<dt class="text-muted-foreground">Proc here</dt>
						<dd>{percentFormatter.format(highlightedRow.exactChance)}</dd>
					</div>
					<div class="flex items-center justify-between gap-5 font-medium">
						<dt>Proc by now</dt>
						<dd>{percentFormatter.format(highlightedRow.cumulativeChance)}</dd>
					</div>
				</dl>
			</div>
		{/if}
	</div>
</Chart.Container>
