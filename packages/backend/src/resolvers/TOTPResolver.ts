import { authenticator } from 'otplib';
import { Resolver, Ctx, Arg, Mutation, Authorized } from 'type-graphql';
import Result from './types/Result';
import { User, GrantType } from '../entity/User';
import { Context } from '../types';

@Resolver()
export class TOTPResolver {
    // NOTE: This is intentionally unauthorized because we don't yet have a full
    // user session that can be resolved.
    @Mutation(() => Result)
    async exchangeTOTP(@Ctx() { session, cookies }: Context, @Arg('token') token: string) {
        const user = await User.fromTOTPSession(session, token);
        user.signIn(session, cookies);
        return new Result();
    }

    @Authorized(GrantType.SESSION)
    @Mutation(() => Result)
    async enableTotp(
        @Ctx() { user }: Context,
        @Arg('secret') secret: string,
        @Arg('token') token: string
    ) {
        if (user.totpSecret) {
            throw new Error('User already has TOTP enabled.');
        }

        // TODO: Move to user?
        const isValid = authenticator.verify({ secret, token });
        if (!isValid) {
            throw new Error('Invalid TOTP');
        }
        user.totpSecret = secret;
        await user.save();
        return new Result();
    }

    @Authorized(GrantType.SESSION)
    @Mutation(() => Result)
    async disableTotp(@Ctx() { user }: Context, @Arg('password') password: string) {
        await user.disableTOTP(password);
        return new Result();
    }
}
