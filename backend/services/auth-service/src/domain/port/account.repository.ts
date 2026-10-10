import { Account, Email } from '../model';

export const ACCOUNT_REPOSITORY = 'ACCOUNT_REPOSITORY';

export interface AccountRepository {
  save(account: Account): Promise<void>;
  existsByEmail(email: Email): Promise<boolean>;
}
