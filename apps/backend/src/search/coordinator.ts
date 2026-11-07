export type CandidateLease = {
  leaseId: string;
  subjectId: string;
  registrationVersion: number;
  joinedAt: number;
  expiresAt: number;
};

export type Assignment = {
  roundId: string;
  first: CandidateLease;
  second: CandidateLease;
  pairVersionKey: string;
};

export type CoordinatorState = {
  roundId: string;
  spentBySubject: Readonly<Record<string, number>>;
  activeSubjects: readonly string[];
  seenPairVersions: readonly string[];
};

export type SelectionInput = {
  now: number;
  leases: readonly CandidateLease[];
  blockedPairs: readonly (readonly [string, string])[];
  state: CoordinatorState;
  random?: () => number;
};

export type Selection = { assignment: Assignment; state: CoordinatorState };

export function pairVersionKey(
  first: CandidateLease,
  second: CandidateLease,
): string {
  const participants = [
    [first.subjectId, first.registrationVersion],
    [second.subjectId, second.registrationVersion],
  ].sort(([left], [right]) => String(left).localeCompare(String(right)));
  return JSON.stringify(participants);
}

function isBlocked(
  first: string,
  second: string,
  pairs: SelectionInput["blockedPairs"],
): boolean {
  return pairs.some(
    ([left, right]) =>
      (left === first && right === second) ||
      (left === second && right === first),
  );
}

function rankLeases(input: SelectionInput): CandidateLease[] {
  const random = input.random ?? Math.random;
  const active = new Set(input.state.activeSubjects);
  const ranked = input.leases
    .filter(
      (lease) =>
        lease.expiresAt > input.now &&
        lease.joinedAt <= input.now &&
        !active.has(lease.subjectId) &&
        (input.state.spentBySubject[lease.subjectId] ?? 0) < 3,
    )
    .map((lease) => ({ lease, tie: random() }))
    .sort(
      (left, right) =>
        left.lease.joinedAt - right.lease.joinedAt ||
        left.tie - right.tie ||
        left.lease.leaseId.localeCompare(right.lease.leaseId),
    );
  const subjects = new Set<string>();
  return ranked.flatMap(({ lease }) => {
    if (subjects.has(lease.subjectId)) return [];
    subjects.add(lease.subjectId);
    return [lease];
  });
}

export function selectAssignment(input: SelectionInput): Selection | null {
  const ranked = rankLeases(input);
  const seen = new Set(input.state.seenPairVersions);
  for (const first of ranked) {
    for (const second of ranked) {
      if (first.subjectId === second.subjectId) continue;
      if (isBlocked(first.subjectId, second.subjectId, input.blockedPairs))
        continue;
      const key = pairVersionKey(first, second);
      if (seen.has(key)) continue;
      return {
        assignment: {
          roundId: input.state.roundId,
          first,
          second,
          pairVersionKey: key,
        },
        state: {
          ...input.state,
          spentBySubject: {
            ...input.state.spentBySubject,
            [first.subjectId]:
              (input.state.spentBySubject[first.subjectId] ?? 0) + 1,
            [second.subjectId]:
              (input.state.spentBySubject[second.subjectId] ?? 0) + 1,
          },
          activeSubjects: [
            ...input.state.activeSubjects,
            first.subjectId,
            second.subjectId,
          ],
          seenPairVersions: [...input.state.seenPairVersions, key],
        },
      };
    }
  }
  return null;
}

export function releaseAssignment(
  state: CoordinatorState,
  assignment: Assignment,
): CoordinatorState {
  if (assignment.roundId !== state.roundId) return state;
  const released = new Set([
    assignment.first.subjectId,
    assignment.second.subjectId,
  ]);
  return {
    ...state,
    activeSubjects: state.activeSubjects.filter(
      (subject) => !released.has(subject),
    ),
  };
}
