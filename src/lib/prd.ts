export type PrdRow = {
	attempt: number;
	failuresBefore: number;
	conditionalChance: number;
	exactChance: number;
	cumulativeChance: number;
	remainingChance: number;
};

export type PrdResult = {
	targetChance: number;
	constant: number;
	expectedAttempts: number;
	guaranteedAttempt: number;
	cumulativeCertainAttempt: number;
	medianAttempt: number;
	rows: PrdRow[];
};

const SOLVER_ITERATIONS = 80;
const NEGLIGIBLE_CHANCE = 1e-16;
const DISPLAYED_CERTAINTY_THRESHOLD = 0.9999995;

function expectedAttemptsForConstant(constant: number): number {
	if (constant >= 1) return 1;

	let expectedAttempts = 0;
	let chanceOfReachingAttempt = 1;
	let attempt = 1;

	while (chanceOfReachingAttempt > NEGLIGIBLE_CHANCE) {
		expectedAttempts += chanceOfReachingAttempt;

		const conditionalChance = Math.min(1, constant * attempt);
		chanceOfReachingAttempt *= 1 - conditionalChance;

		if (conditionalChance === 1) break;
		attempt += 1;
	}

	return expectedAttempts;
}

export function solvePrdConstant(targetChance: number): number {
	if (!(targetChance > 0 && targetChance < 1)) {
		throw new RangeError('Target chance must be between 0 and 1.');
	}

	let lowerBound = 0;
	let upperBound = 1;

	for (let iteration = 0; iteration < SOLVER_ITERATIONS; iteration += 1) {
		const candidate = (lowerBound + upperBound) / 2;
		const candidateChance = 1 / expectedAttemptsForConstant(candidate);

		if (candidateChance < targetChance) {
			lowerBound = candidate;
		} else {
			upperBound = candidate;
		}
	}

	return (lowerBound + upperBound) / 2;
}

export function calculatePrd(targetChance: number): PrdResult {
	const constant = solvePrdConstant(targetChance);
	const guaranteedAttempt = Math.ceil(1 / constant);
	const rows: PrdRow[] = [];
	let chanceOfReachingAttempt = 1;

	for (let attempt = 1; attempt <= guaranteedAttempt; attempt += 1) {
		const conditionalChance = Math.min(1, constant * attempt);
		const exactChance = chanceOfReachingAttempt * conditionalChance;
		const remainingChance = chanceOfReachingAttempt - exactChance;

		rows.push({
			attempt,
			failuresBefore: attempt - 1,
			conditionalChance,
			exactChance,
			cumulativeChance: 1 - remainingChance,
			remainingChance
		});

		chanceOfReachingAttempt = remainingChance;
	}

	return {
		targetChance,
		constant,
		expectedAttempts: expectedAttemptsForConstant(constant),
		guaranteedAttempt,
		cumulativeCertainAttempt:
			rows.find((row) => row.cumulativeChance >= DISPLAYED_CERTAINTY_THRESHOLD)?.attempt ??
			guaranteedAttempt,
		medianAttempt: rows.find((row) => row.cumulativeChance >= 0.5)?.attempt ?? guaranteedAttempt,
		rows
	};
}
