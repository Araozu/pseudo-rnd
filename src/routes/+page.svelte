<script lang="ts">
	import PrdChart from '$lib/components/prd-chart.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import * as Table from '$lib/components/ui/table';
	import { calculatePrd } from '$lib/prd';

	const presets = [10, 15, 20, 25, 30, 50];
	const percentFormatter = new Intl.NumberFormat('en-US', {
		style: 'percent',
		minimumFractionDigits: 2,
		maximumFractionDigits: 4
	});

	let targetPercentage = $state<number | undefined>(25);
	let highlightedAttempt = $state<number | null>(null);
	let tableViewport = $state<HTMLDivElement>();

	let isValidTarget = $derived(
		typeof targetPercentage === 'number' &&
			Number.isFinite(targetPercentage) &&
			targetPercentage >= 1 &&
			targetPercentage <= 99
	);
	let result = $derived.by(() => {
		if (!isValidTarget || targetPercentage === undefined) return null;
		return calculatePrd(targetPercentage / 100);
	});

	function clearHighlight() {
		highlightedAttempt = null;
	}

	function formatPercent(value: number): string {
		if (value === 0 || value === 1) return percentFormatter.format(value);
		if (value < 0.0001) return `${(value * 100).toExponential(2)}%`;
		return percentFormatter.format(value);
	}

	function highlightTableRow(attempt: number | null) {
		highlightedAttempt = attempt;
		if (attempt === null || !window.matchMedia('(min-width: 1280px)').matches) return;

		requestAnimationFrame(() => {
			tableViewport
				?.querySelector<HTMLTableRowElement>(`[data-attempt="${attempt}"]`)
				?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		});
	}
</script>

<svelte:head>
	<title>Pseudo-Random Distribution Calculator</title>
	<meta
		name="description"
		content="Calculate and visualize Dota 2-style pseudo-random distribution probabilities."
	/>
</svelte:head>

<main class="min-h-screen w-full xl:h-screen xl:overflow-hidden">
	<div
		class="grid min-h-screen xl:h-full xl:grid-cols-[16rem_minmax(24rem,0.85fr)_minmax(30rem,1.35fr)]"
	>
		<aside class="border-b p-4 xl:min-h-0 xl:overflow-y-auto xl:border-r xl:border-b-0">
			<h1 class="mb-6 text-xl font-semibold tracking-tight">Pseudo-random calculator</h1>

			<div class="space-y-4">
				<Card.Root size="sm">
					<Card.Header>
						<Card.Title>Target proc rate</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="space-y-2">
							<Label for="target-percentage">Percentage</Label>
							<div class="relative">
								<Input
									id="target-percentage"
									type="number"
									min="1"
									max="99"
									step="0.1"
									bind:value={targetPercentage}
									oninput={clearHighlight}
									aria-invalid={!isValidTarget}
									class="pr-8 tabular-nums"
								/>
								<span
									class="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground"
								>
									%
								</span>
							</div>
							{#if !isValidTarget}
								<p class="text-xs text-destructive">Enter a value from 1 to 99.</p>
							{/if}
						</div>

						<div class="grid grid-cols-3 gap-1.5" aria-label="Common target percentages">
							{#each presets as preset (preset)}
								<Button
									variant={targetPercentage === preset ? 'default' : 'outline'}
									size="sm"
									onclick={() => {
										targetPercentage = preset;
										clearHighlight();
									}}
								>
									{preset}%
								</Button>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>

				{#if result}
					<Card.Root size="sm">
						<Card.Header>
							<Card.Title>Computed values</Card.Title>
						</Card.Header>
						<Card.Content>
							<dl class="space-y-3">
								<div>
									<dt class="text-xs text-muted-foreground">C constant</dt>
									<dd class="mt-1 font-mono text-xl font-semibold tabular-nums">
										{result.constant.toFixed(8)}
									</dd>
								</div>
								<Separator />
								<div class="flex items-baseline justify-between gap-3">
									<dt class="text-muted-foreground">Initial chance</dt>
									<dd class="font-medium tabular-nums">{formatPercent(result.constant)}</dd>
								</div>
								<div class="flex items-baseline justify-between gap-3">
									<dt class="text-muted-foreground">Expected attempt</dt>
									<dd class="font-medium tabular-nums">{result.expectedAttempts.toFixed(2)}</dd>
								</div>
								<div class="flex items-baseline justify-between gap-3">
									<dt class="text-muted-foreground">50% proc by</dt>
									<dd class="font-medium tabular-nums">#{result.medianAttempt}</dd>
								</div>
								<div class="flex items-baseline justify-between gap-3">
									<dt class="text-muted-foreground">100% proc by</dt>
									<dd class="font-medium tabular-nums">#{result.guaranteedAttempt}</dd>
								</div>
							</dl>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		</aside>

		<section class="flex h-[38rem] min-h-0 flex-col border-b xl:h-full xl:border-r xl:border-b-0">
			<header class="flex h-16 shrink-0 items-center justify-between border-b px-4">
				<h2 class="font-medium">Attempt table</h2>
				{#if result}
					<span class="text-xs text-muted-foreground tabular-nums">
						{result.rows.length} attempts
					</span>
				{/if}
			</header>

			{#if result}
				<div class="min-h-0 flex-1 overflow-auto" bind:this={tableViewport}>
					<Table.Root class="table-fixed">
						<Table.Caption class="sr-only">Probability metrics by attempt</Table.Caption>
						<Table.Header class="sticky top-0 z-10 bg-background">
							<Table.Row>
								<Table.Head class="w-16 px-3">Attempt</Table.Head>
								<Table.Head class="px-2 text-right text-chart-1">Next chance</Table.Head>
								<Table.Head class="px-2 text-right text-chart-2">Proc here</Table.Head>
								<Table.Head class="px-3 text-right text-chart-3">Proc by now</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each result.rows as row (row.attempt)}
								<Table.Row
									data-attempt={row.attempt}
									tabindex={0}
									aria-selected={highlightedAttempt === row.attempt}
									class={highlightedAttempt === row.attempt ? 'bg-muted' : ''}
									onmouseenter={() => (highlightedAttempt = row.attempt)}
									onmouseleave={() => (highlightedAttempt = null)}
									onfocus={() => (highlightedAttempt = row.attempt)}
									onblur={() => (highlightedAttempt = null)}
								>
									<Table.Cell class="px-3 font-medium tabular-nums">{row.attempt}</Table.Cell>
									<Table.Cell class="px-2 text-right text-chart-1 tabular-nums">
										{formatPercent(row.conditionalChance)}
									</Table.Cell>
									<Table.Cell class="px-2 text-right text-chart-2 tabular-nums">
										{formatPercent(row.exactChance)}
									</Table.Cell>
									<Table.Cell class="px-3 text-right font-medium text-chart-3 tabular-nums">
										{formatPercent(row.cumulativeChance)}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{:else}
				<div class="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
					Enter a valid target percentage.
				</div>
			{/if}
		</section>

		<section class="flex h-[34rem] min-h-0 flex-col xl:h-full">
			<header
				class="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b px-5 py-3"
			>
				<h2 class="font-medium">Metric growth</h2>
				<div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
					<span class="flex items-center gap-1.5">
						<span class="h-px w-5 border-t-2 border-dashed border-chart-1"></span>
						Next chance
					</span>
					<span class="flex items-center gap-1.5">
						<span class="h-px w-5 border-t-2 border-dotted border-chart-2"></span>
						Proc here
					</span>
					<span class="flex items-center gap-1.5">
						<span class="h-0.5 w-5 bg-chart-3"></span>
						Proc by now
					</span>
				</div>
			</header>

			{#if result}
				<div class="min-h-0 flex-1 p-3 sm:p-5">
					<PrdChart rows={result.rows} bind:highlightedAttempt onhighlight={highlightTableRow} />
				</div>
			{:else}
				<div class="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
					Enter a valid target percentage.
				</div>
			{/if}
		</section>
	</div>
</main>
