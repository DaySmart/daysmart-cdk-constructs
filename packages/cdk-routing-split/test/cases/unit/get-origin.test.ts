import * as when from '../../steps/when';
import * as given from '../../steps/given';
import { CloudFrontRequestEvent } from 'aws-lambda';

describe('When an entity', () => {
    let request: CloudFrontRequestEvent;
    const failure = {
        headers: {
            location: [
                {
                    key: 'Location',
                    value: 'https://book.myonlineappointment.com/Unavailable/NotFound',
                },
            ],
        },
        status: '404',
        statusDescription: 'Not Found',
    };
    beforeEach(() => {
        request = given.a_getOrigin_event();
    });
    it('calls getOrigin with no domainName', async () => {
        request.Records[0].cf.request.origin.custom.domainName = undefined;
        const response = await when.we_invoke_getOrigin(request);

        expect(response).toStrictEqual(failure);
    });

    it('calls getOrigin with invalid url', async () => {
        request.Records[0].cf.request.origin.custom.domainName = 'sdffdsfs';
        const response = await when.we_invoke_getOrigin(request);

        expect(response).toStrictEqual(failure);
    });
    it('calls getOrigin with no request', async () => {
        const response = await when.we_invoke_getOrigin(undefined);

        expect(response).toStrictEqual(failure);
    });
});
