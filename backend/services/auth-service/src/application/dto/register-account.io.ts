export interface RegisterAccountInput {
  email: string;
  password: string;
}

export interface RegisterAccountResult {
  accountId: string;
  emailVerificationRequired: true;
}
