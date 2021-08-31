import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as origins from "@aws-cdk/aws-cloudfront-origins";
import * as acm from "@aws-cdk/aws-certificatemanager";

export interface CdkS3RedirectProps {
	oldEndpoint: string;
	newEndpoint: string;
	certificateArn: string;
	httpOriginCachePolicyId: string;
	httpOriginRequestPolicyId: string;
	project: string;
	baseEnv: string;
	dynamicEnv?: string;
	componentName: string;
	loggingBucketName?: string;
	errorResponses?: cloudfront.ErrorResponse[];
	cname: string;
}

export class CdkS3Redirect extends cdk.Construct {
	public distribution: cloudfront.Distribution;

	constructor(scope: cdk.Construct, id: string, props: CdkS3RedirectProps) {
		super(scope, id);

		let logFilePrefix: string | undefined = undefined;

		const bucket = new s3.Bucket(
			this,
			`${props.oldEndpoint}-Redirect-Bucket`,
			{
				bucketName: props.oldEndpoint,
				publicReadAccess: true,
				versioned: true,
				removalPolicy: cdk.RemovalPolicy.DESTROY,
				autoDeleteObjects: true,
				websiteRedirect: {
					hostName: props.newEndpoint,
					protocol: s3.RedirectProtocol.HTTPS,
				},
			}
		);

		const certificate = acm.Certificate.fromCertificateArn(
			this,
			"Certificate",
			props.certificateArn
		);

		const httpOriginCachePolicy = cloudfront.CachePolicy.fromCachePolicyId(
			this,
			"HttpOriginCachePolicy",
			props.httpOriginCachePolicyId
		);
		const httpOriginRequestPolicy = cloudfront.OriginRequestPolicy.fromOriginRequestPolicyId(
			this,
			"HttpOriginRequestPolicy",
			props.httpOriginRequestPolicyId
		);

		const defaultBehaviorOptions = {
			origin: new origins.HttpOrigin(bucket.bucketWebsiteDomainName, {
				protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
				originSslProtocols: [
					cloudfront.OriginSslPolicy.TLS_V1_1,
					cloudfront.OriginSslPolicy.TLS_V1_2,
				],
				readTimeout: cdk.Duration.seconds(60),
			}),
			allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
			viewerProtocolPolicy:
				cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
			cachePolicy: httpOriginCachePolicy,
			originRequestPolicy: httpOriginRequestPolicy,
		};

		if (props.loggingBucketName) {
			logFilePrefix = props.dynamicEnv
				? `${props.dynamicEnv}-${props.project}-redirect`
				: `${props.baseEnv}-${props.project}-redirect`;
		}

		const distribution = new cloudfront.Distribution(this, "Distribution", {
			defaultBehavior: defaultBehaviorOptions,
			certificate: certificate,
			domainNames: [props.cname],
			comment: props.dynamicEnv
				? `${props.dynamicEnv} ${props.project} redirect`
				: `${props.baseEnv} ${props.project} redirect`,
			enableLogging: props.loggingBucketName ? true : false,
			logBucket: props.loggingBucketName
				? s3.Bucket.fromBucketName(
						this,
						"CloudfrontLoggingBucket",
						props.loggingBucketName
				  )
				: undefined,
			logIncludesCookies: props.loggingBucketName ? true : false,
			logFilePrefix: logFilePrefix,
			httpVersion: cloudfront.HttpVersion.HTTP2,
			priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
			errorResponses: props.errorResponses
				? props.errorResponses
				: undefined,
			minimumProtocolVersion:
				cloudfront.SecurityPolicyProtocol.TLS_V1_1_2016,
		});
		this.distribution = distribution;
	}
}
