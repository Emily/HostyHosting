import React from 'react';
import { useMeDaddyQuery } from '../../queries';
import OnboardTOTP from './OnboardTOTP';
import DisableTOTP from './DisableTOTP';
import useBoolean from '../../utils/useBoolean';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import Card, { CardContent } from '../ui/Card';

function TOTPModal({
    visible,
    hasTOTP,
    onClose,
}: {
    visible: boolean;
    hasTOTP: boolean;
    onClose(): void;
}) {
    if (hasTOTP) {
        return <DisableTOTP visible={visible} onClose={onClose} />;
    }
    return <OnboardTOTP visible={visible} onClose={onClose} />;
}

export default function Security() {
    const [totpModalVisible, { off, on }] = useBoolean(false);
    const { data, loading, refetch } = useMeDaddyQuery();

    if (loading || !data) {
        return <Spinner />;
    }

    function onClose() {
        off();
        refetch();
    }

    return (
        <Card>
            <CardContent>
                <Button>Change Password</Button>
                <hr className="my-6" />
                <p className="text-gray-700 leading-normal mb-2">
                    Two factor auth <strong>{data.me.hasTOTP ? 'is' : 'is not'}</strong> enabled.
                </p>
                <Button variant={data.me.hasTOTP ? 'danger' : 'default'} onClick={on}>
                    {data.me.hasTOTP ? 'Disable' : 'Enable'} Two-Factor Authentication
                </Button>
                <TOTPModal visible={totpModalVisible} hasTOTP={data.me.hasTOTP} onClose={onClose} />
            </CardContent>
        </Card>
    );
}
