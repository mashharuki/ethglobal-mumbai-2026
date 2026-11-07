/* tslint:disable */
/* eslint-disable */
/**
 * Private, fixed receipt signed by a trusted coordinator key configured outside requests.
 * @export
 * @interface AcceptanceReceipt
 */
export interface AcceptanceReceipt {
    /**
     *
     */
    receiptId: string;
    /**
     *
     */
    operationId: string;
    /**
     *
     */
    inputDigest: string;
    /**
     *
     */
    expiresAt: string;
    /**
     *
     */
    issuerKeyVersion: number;
    /**
     *
     */
    issuerSignature: string;
}
/**
 *
 * @export
 * @interface AcceptedOperation
 */
export interface AcceptedOperation {
    /**
     *
     */
    operationId: string;
    /**
     *
     */
    status: AcceptedOperationStatusEnum;
}


/**
 * @export
 */
export const AcceptedOperationStatusEnum = {
    Pending: 'pending',
} as const;
export type AcceptedOperationStatusEnum = typeof AcceptedOperationStatusEnum[keyof typeof AcceptedOperationStatusEnum];

/**
 *
 * @export
 * @interface ApiError
 */
export interface ApiError {
    /**
     *
     */
    code: ApiErrorCodeEnum;
    /**
     * Generic public explanation; never echo signatures, tokens or private data.
     */
    message: string;
    /**
     *
     */
    operationId?: string;
}


/**
 * @export
 */
export const ApiErrorCodeEnum = {
    Unauthenticated: 'UNAUTHENTICATED',
    Ineligible: 'INELIGIBLE',
    NotFound: 'NOT_FOUND',
    Conflict: 'CONFLICT',
    InvalidInput: 'INVALID_INPUT',
    RateLimited: 'RATE_LIMITED',
    Unavailable: 'UNAVAILABLE',
} as const;
export type ApiErrorCodeEnum = typeof ApiErrorCodeEnum[keyof typeof ApiErrorCodeEnum];

/**
 *
 * @export
 * @interface AssetAmount
 */
export interface AssetAmount {
    /**
     *
     */
    chainId: AssetAmountChainIdEnum;
    /**
     *
     */
    tokenAddress: string;
    /**
     * Decimal integer in token minimal units; never a JSON number.
     */
    amountBaseUnits: string;
}


/**
 * @export
 */
export const AssetAmountChainIdEnum = {
    NUMBER_11155111: 11155111,
} as const;
export type AssetAmountChainIdEnum = typeof AssetAmountChainIdEnum[keyof typeof AssetAmountChainIdEnum];

/**
 *
 * @export
 * @interface AuthChallenge
 */
export interface AuthChallenge {
    /**
     * SIWE message binding domain, URI, chainId 11155111, nonce and expiry.
     */
    message: string;
    /**
     *
     */
    expiresAt: string;
}
/**
 *
 * @export
 * @interface AuthChallengeRequest
 */
export interface AuthChallengeRequest {
    /**
     *
     */
    address: string;
}
/**
 *
 * @export
 * @interface AuthSessionRequest
 */
export interface AuthSessionRequest {
    /**
     *
     */
    message: string;
    /**
     *
     */
    signature: string;
}
/**
 *
 * @export
 * @interface AuthorizedMatch
 */
export interface AuthorizedMatch {
    /**
     *
     */
    matchId: string;
    /**
     *
     */
    agentPersonaId: string;
    /**
     *
     */
    playerSubject: string;
    /**
     *
     */
    simulationConsent: AuthorizedMatchSimulationConsentEnum;
    /**
     * Unix timestamp in seconds, matching the AIBot Adapter.
     */
    expiresAt: number;
}


/**
 * @export
 */
export const AuthorizedMatchSimulationConsentEnum = {
    True: true,
} as const;
export type AuthorizedMatchSimulationConsentEnum = typeof AuthorizedMatchSimulationConsentEnum[keyof typeof AuthorizedMatchSimulationConsentEnum];

/**
 *
 * @export
 * @interface BlockRequest
 */
export interface BlockRequest {
    /**
     *
     */
    targetSubject: string;
}
/**
 *
 * @export
 * @interface DateRequest
 */
export interface DateRequest {
    /**
     *
     */
    requestId: string;
    /**
     *
     */
    status: DateRequestStatusEnum;
}


/**
 * @export
 */
export const DateRequestStatusEnum = {
    Pending: 'pending',
    Accepted: 'accepted',
} as const;
export type DateRequestStatusEnum = typeof DateRequestStatusEnum[keyof typeof DateRequestStatusEnum];

/**
 *
 * @export
 * @interface DateRequestInput
 */
export interface DateRequestInput {
    /**
     *
     */
    matchId: string;
    /**
     *
     */
    gameSessionId: string;
}
/**
 *
 * @export
 * @interface InviteDecision
 */
export interface InviteDecision {
    /**
     *
     */
    decision: InviteDecisionDecisionEnum;
    /**
     *
     */
    envelopeDigest: string;
    /**
     *
     */
    signature: string;
}


/**
 * @export
 */
export const InviteDecisionDecisionEnum = {
    Accept: 'accept',
    Reject: 'reject',
} as const;
export type InviteDecisionDecisionEnum = typeof InviteDecisionDecisionEnum[keyof typeof InviteDecisionDecisionEnum];

/**
 *
 * @export
 * @interface InviteDecisionResult
 */
export interface InviteDecisionResult {
    /**
     *
     */
    operationId: string;
    /**
     *
     */
    state: InviteDecisionResultStateEnum;
    /**
     *
     */
    receipt?: AcceptanceReceipt;
}


/**
 * @export
 */
export const InviteDecisionResultStateEnum = {
    Pending: 'pending',
    Rejected: 'rejected',
    Ready: 'ready',
} as const;
export type InviteDecisionResultStateEnum = typeof InviteDecisionResultStateEnum[keyof typeof InviteDecisionResultStateEnum];

/**
 *
 * @export
 * @interface InviteDelivery
 */
export interface InviteDelivery {
    /**
     *
     */
    operationId: string;
    /**
     *
     */
    inviteId: string;
    /**
     *
     */
    deliveryStatus: InviteDeliveryDeliveryStatusEnum;
}


/**
 * @export
 */
export const InviteDeliveryDeliveryStatusEnum = {
    Pending: 'pending',
    Delivered: 'delivered',
    Failed: 'failed',
} as const;
export type InviteDeliveryDeliveryStatusEnum = typeof InviteDeliveryDeliveryStatusEnum[keyof typeof InviteDeliveryDeliveryStatusEnum];

/**
 *
 * @export
 * @interface InviteEnvelope
 */
export interface InviteEnvelope {
    /**
     *
     */
    inviteId: string;
    /**
     *
     */
    leaseIds: Array<string>;
    /**
     *
     */
    operationId: string;
    /**
     *
     */
    chainId: InviteEnvelopeChainIdEnum;
    /**
     *
     */
    contractAddress: string;
    /**
     *
     */
    inputDigest: string;
    /**
     *
     */
    acceptanceDeadline: string;
    /**
     *
     */
    subjectSignature: string;
}


/**
 * @export
 */
export const InviteEnvelopeChainIdEnum = {
    NUMBER_11155111: 11155111,
} as const;
export type InviteEnvelopeChainIdEnum = typeof InviteEnvelopeChainIdEnum[keyof typeof InviteEnvelopeChainIdEnum];

/**
 *
 * @export
 * @interface InviteRequest
 */
export interface InviteRequest {
    /**
     *
     */
    registrationVersion: number;
    /**
     *
     */
    depositRef: string;
    /**
     * Opaque encrypted bytes; the API must not decrypt them.
     */
    ciphertext: string;
    /**
     *
     */
    envelope: InviteEnvelope;
}
/**
 *
 * @export
 * @interface OwnerDeposit
 */
export interface OwnerDeposit {
    /**
     *
     */
    id: string;
    /**
     *
     */
    asset: AssetAmount;
    /**
     *
     */
    confirmationStatus: OwnerDepositConfirmationStatusEnum;
    /**
     *
     */
    depositedAt: string;
    /**
     *
     */
    refundAvailableAt: string;
}


/**
 * @export
 */
export const OwnerDepositConfirmationStatusEnum = {
    Pending: 'pending',
    Confirmed: 'confirmed',
    Failed: 'failed',
} as const;
export type OwnerDepositConfirmationStatusEnum = typeof OwnerDepositConfirmationStatusEnum[keyof typeof OwnerDepositConfirmationStatusEnum];

/**
 *
 * @export
 * @interface PersonaMetadata
 */
export interface PersonaMetadata {
    /**
     *
     */
    personaId: string;
    /**
     *
     */
    ownerSubject: string;
    /**
     *
     */
    status: PersonaMetadataStatusEnum;
    /**
     *
     */
    version: number;
}


/**
 * @export
 */
export const PersonaMetadataStatusEnum = {
    Approved: 'approved',
    Revoked: 'revoked',
} as const;
export type PersonaMetadataStatusEnum = typeof PersonaMetadataStatusEnum[keyof typeof PersonaMetadataStatusEnum];

/**
 *
 * @export
 * @interface PrivateOperation
 */
export interface PrivateOperation {
    /**
     *
     */
    operationId: string;
    /**
     *
     */
    kind: PrivateOperationKindEnum;
    /**
     *
     */
    status: PrivateOperationStatusEnum;
    /**
     *
     */
    createdAt: string;
    /**
     *
     */
    updatedAt: string;
    /**
     *
     */
    errorCode?: string;
}


/**
 * @export
 */
export const PrivateOperationKindEnum = {
    Registration: 'registration',
    Invite: 'invite',
    Review: 'review',
    Block: 'block',
    Settlement: 'settlement',
} as const;
export type PrivateOperationKindEnum = typeof PrivateOperationKindEnum[keyof typeof PrivateOperationKindEnum];

/**
 * @export
 */
export const PrivateOperationStatusEnum = {
    Pending: 'pending',
    Confirmed: 'confirmed',
    Failed: 'failed',
} as const;
export type PrivateOperationStatusEnum = typeof PrivateOperationStatusEnum[keyof typeof PrivateOperationStatusEnum];

/**
 *
 * @export
 * @interface PrivateReviewCase
 */
export interface PrivateReviewCase {
    /**
     *
     */
    caseId: string;
    /**
     *
     */
    policyVersion: number;
    /**
     *
     */
    prohibitedAct: string;
    /**
     *
     */
    state: PrivateReviewCaseStateEnum;
    /**
     *
     */
    revision: number;
    /**
     *
     */
    openedAt: string;
    /**
     *
     */
    syntheticSummary?: string;
    /**
     *
     */
    responseDeadline?: string;
    /**
     *
     */
    appealDeadline?: string;
    /**
     *
     */
    suspendedUntil?: string;
}


/**
 * @export
 */
export const PrivateReviewCaseStateEnum = {
    Received: 'received',
    Reviewing: 'reviewing',
    Decided: 'decided',
    Appealed: 'appealed',
    Closed: 'closed',
} as const;
export type PrivateReviewCaseStateEnum = typeof PrivateReviewCaseStateEnum[keyof typeof PrivateReviewCaseStateEnum];

/**
 *
 * @export
 * @interface PublicRegistration
 */
export interface PublicRegistration {
    /**
     *
     */
    alias: string;
    /**
     *
     */
    version: number;
    /**
     *
     */
    commitment: string;
    /**
     *
     */
    arkivEntityKey: string;
    /**
     *
     */
    expiresAt: string;
}
/**
 *
 * @export
 * @interface RegistrationRequest
 */
export interface RegistrationRequest {
    /**
     *
     */
    alias: string;
    /**
     *
     */
    version: number;
    /**
     *
     */
    commitment: string;
    /**
     *
     */
    proof: string;
    /**
     *
     */
    ownerSignature: string;
    /**
     *
     */
    depositRef: string;
}
/**
 *
 * @export
 * @interface ReviewCaseRequest
 */
export interface ReviewCaseRequest {
    /**
     *
     */
    contactCapability: string;
    /**
     *
     */
    fixtureId: string;
    /**
     *
     */
    policyVersion: number;
}
/**
 *
 * @export
 * @interface ReviewDecisionRequest
 */
export interface ReviewDecisionRequest {
    /**
     *
     */
    expectedRevision: number;
    /**
     *
     */
    policyVersion: number;
    /**
     *
     */
    decision: ReviewDecisionRequestDecisionEnum;
    /**
     *
     */
    fixtureId: string;
    /**
     *
     */
    suspendedUntil?: string;
}


/**
 * @export
 */
export const ReviewDecisionRequestDecisionEnum = {
    Dismiss: 'dismiss',
    Suspend: 'suspend',
    Uphold: 'uphold',
    Reverse: 'reverse',
} as const;
export type ReviewDecisionRequestDecisionEnum = typeof ReviewDecisionRequestDecisionEnum[keyof typeof ReviewDecisionRequestDecisionEnum];

/**
 *
 * @export
 * @interface ReviewResponseRequest
 */
export interface ReviewResponseRequest {
    /**
     *
     */
    expectedRevision: number;
    /**
     *
     */
    fixtureId: string;
}
/**
 *
 * @export
 * @interface SearchChannelMessage
 */
export interface SearchChannelMessage {
    /**
     *
     */
    roundId: string;
    /**
     *
     */
    assignmentId: string;
    /**
     *
     */
    sequence: number;
    /**
     * Opaque encrypted bytes; the API must not decrypt them.
     */
    ciphertext: string;
}
/**
 *
 * @export
 * @interface SearchLease
 */
export interface SearchLease {
    /**
     *
     */
    leaseId: string;
    /**
     *
     */
    expiresAt: string;
}
/**
 *
 * @export
 * @interface SearchLeaseRenewal
 */
export interface SearchLeaseRenewal {
    /**
     *
     */
    ownerSignature: string;
}
/**
 *
 * @export
 * @interface SearchLeaseRequest
 */
export interface SearchLeaseRequest {
    /**
     *
     */
    ephemeralPublicKey: string;
    /**
     *
     */
    credentialGeneration: string;
    /**
     *
     */
    credentialVersion: number;
    /**
     *
     */
    registrationVersion: number;
    /**
     *
     */
    ownerSignature: string;
}
/**
 *
 * @export
 * @interface SimulationConsent
 */
export interface SimulationConsent {
    /**
     *
     */
    version: number;
    /**
     *
     */
    participate: boolean;
    /**
     *
     */
    allowPersonaUse: boolean;
    /**
     *
     */
    updatedAt: string;
}
/**
 *
 * @export
 * @interface SimulationConsentRequest
 */
export interface SimulationConsentRequest {
    /**
     *
     */
    expectedVersion: number;
    /**
     *
     */
    participate: boolean;
    /**
     *
     */
    allowPersonaUse: boolean;
}
/**
 *
 * @export
 * @interface SimulationIdentity
 */
export interface SimulationIdentity {
    /**
     * HMAC-SHA256 assertion binding server-selected sub, aud and exp.
     */
    assertion: string;
    /**
     *
     */
    expiresAt: string;
}
