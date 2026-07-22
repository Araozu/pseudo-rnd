<script lang="ts">
	import { Dices, Sigma, Target } from '@lucide/svelte';
	import { calculatePrd } from '$lib/prd';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Progress } from '$lib/components/ui/progress';
	import { Separator } from '$lib/components/ui/separator';
	import * as Table from '$lib/components/ui/table';

	const presets = [10, 15, 20, 25, 30, 50];

	let targetPercentage = $state<number | undefined>(25);

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

	const percentFormatter = new Intl.NumberFormat('en-US', {
		style: 'percent',
		minimumFractionDigits: 2,
		maximumFractionDigits: 6
	});

	function formatPercent(value: number): string {
		if (value === 0 || value === 1) {
			return percentFormatter.format(value);
		}

		if (value < 0.0001) {
			return `${(value * 100).toExponential(2)}%`;
		}

		return percentFormatter.format(value);
	}
</script>

<svelte:head>
	<title>Pseudo-Random Distribution Calculator</title>
	<meta
		name="description"
		content="Calculate the C constant and per-attempt probabilities for Dota 2-style pseudo-random distribution."
	/>
</svelte:head>

<main class="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
	<header class="mb-10 flex items-start justify-between gap-6">
		<div class="max-w-2xl">
			<div class="mb-4 flex items-center gap-2">
				<div
					class="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
				>
					<Dices class="size-4" aria-hidden="true" />
				</div>
				<Badge variant="secondary">Dota 2 PRD</Badge>
			</div>
			<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">Pseudo-random calculator</h1>
			<p class="mt-3 max-w-xl text-base leading-7 text-muted-foreground">
				Find the C constant that produces a target long-run proc rate, then inspect the accumulated
				chance of a proc by every attempt.
			</p>
		</div>
	</header>

	<div class="grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
		<div class="space-y-6 lg:sticky lg:top-8">
			<Card.Root>
				<Card.Header>
					<Card.Title>Target proc rate</Card.Title>
					<Card.Description>
						The average rate over many reset cycles, not the first-roll chance.
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-5">
					<div class="space-y-2">
						<Label for="target-percentage">Target percentage</Label>
						<div class="relative">
							<Input
								id="target-percentage"
								type="number"
								min="1"
								max="99"
								step="0.1"
								bind:value={targetPercentage}
								aria-invalid={!isValidTarget}
								class="pr-9 tabular-nums"
							/>
							<span
								class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
							>
								%
							</span>
						</div>
						{#if !isValidTarget}
							<p class="text-xs text-destructive">Enter a percentage from 1 to 99.</p>
						{/if}
					</div>

					<div class="flex flex-wrap gap-2" aria-label="Common target percentages">
						{#each presets as preset (preset)}
							<Button
								variant={targetPercentage === preset ? 'default' : 'outline'}
								size="sm"
								onclick={() => (targetPercentage = preset)}
							>
								{preset}%
							</Button>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root size="sm">
				<Card.Header>
					<Card.Title class="flex items-center gap-2 text-sm">
						<Sigma class="size-4 text-muted-foreground" aria-hidden="true" />
						How it is calculated
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-3 text-sm leading-6 text-muted-foreground">
					<p>
						After <span class="font-medium text-foreground">N - 1</span> failures, the next chance
						is <span class="font-mono text-foreground">min(1, C × N)</span>.
					</p>
					<Separator />
					<p>
						The accumulated chance by N is
						<span class="font-mono text-foreground">1 - ∏(1 - min(1, C × i))</span> across every roll
						so far.
					</p>
				</Card.Content>
			</Card.Root>
		</div>

		{#if result}
			<section class="min-w-0 space-y-6" aria-live="polite">
				<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<Card.Root size="sm">
						<Card.Header>
							<Card.Description>C constant</Card.Description>
							<Card.Title class="font-mono text-xl tabular-nums">
								{result.constant.toFixed(8)}
							</Card.Title>
						</Card.Header>
					</Card.Root>
					<Card.Root size="sm">
						<Card.Header>
							<Card.Description>First attempt</Card.Description>
							<Card.Title class="text-xl tabular-nums">
								{formatPercent(result.constant)}
							</Card.Title>
						</Card.Header>
					</Card.Root>
					<Card.Root size="sm">
						<Card.Header>
							<Card.Description>50% proc chance by</Card.Description>
							<Card.Title class="text-xl tabular-nums">
								Attempt {result.medianAttempt}
							</Card.Title>
						</Card.Header>
					</Card.Root>
					<Card.Root size="sm">
						<Card.Header>
							<Card.Description>100% proc chance by</Card.Description>
							<Card.Title class="text-xl tabular-nums">
								Attempt {result.guaranteedAttempt}
							</Card.Title>
						</Card.Header>
					</Card.Root>
				</div>

				<Card.Root>
					<Card.Header>
						<div class="flex items-start justify-between gap-4">
							<div>
								<Card.Title class="flex items-center gap-2">
									<Target class="size-4 text-muted-foreground" aria-hidden="true" />
									Accumulated chance progression
								</Card.Title>
								<Card.Description class="mt-1.5">
									Half of procs happen by attempt {result.medianAttempt}; a proc is certain by
									attempt {result.guaranteedAttempt}.
								</Card.Description>
							</div>
							<Badge variant="outline">{result.rows.length} rows</Badge>
						</div>
					</Card.Header>
					<Card.Content>
						<div class="max-h-[42rem] overflow-y-auto rounded-lg border border-border">
							<Table.Root>
								<Table.Caption class="sr-only">
									Accumulated pseudo-random proc probability by attempt
								</Table.Caption>
								<Table.Header class="sticky top-0 z-10 bg-background">
									<Table.Row>
										<Table.Head class="w-20">Attempt</Table.Head>
										<Table.Head>Failures</Table.Head>
										<Table.Head class="min-w-52">Proc by now</Table.Head>
										<Table.Head class="text-right">Next roll</Table.Head>
										<Table.Head class="text-right">Proc on this attempt</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each result.rows as row (row.attempt)}
										<Table.Row>
											<Table.Cell class="font-medium tabular-nums">
												{row.attempt}
											</Table.Cell>
											<Table.Cell class="text-muted-foreground tabular-nums">
												{row.failuresBefore}
											</Table.Cell>
											<Table.Cell>
												<div class="flex min-w-48 items-center gap-3">
													<Progress value={row.cumulativeChance * 100} class="w-24 shrink-0" />
													<span class="font-medium tabular-nums">
														{formatPercent(row.cumulativeChance)}
													</span>
													{#if row.isCertainByNow}
														<Badge variant="secondary">100% cumulative</Badge>
													{/if}
												</div>
											</Table.Cell>
											<Table.Cell class="text-right tabular-nums">
												{formatPercent(row.conditionalChance)}
											</Table.Cell>
											<Table.Cell class="text-right tabular-nums">
												{formatPercent(row.exactChance)}
											</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					</Card.Content>
				</Card.Root>
			</section>
		{:else}
			<Card.Root class="min-h-64 items-center justify-center border-dashed">
				<Card.Content class="text-center text-muted-foreground">
					Enter a valid target percentage to calculate its PRD table.
				</Card.Content>
			</Card.Root>
		{/if}
	</div>

	<footer class="mt-12 text-center text-xs text-muted-foreground">
		Uses the conditional Dota 2 PRD model. Every successful proc resets the attempt counter.
	</footer>
</main>
