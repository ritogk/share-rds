import {
  Stack,
  StackProps,
  Duration,
  aws_ec2 as ec2,
  aws_rds as rds,
  aws_iam as iam,
  aws_ssm as ssm,
  aws_secretsmanager as secretsmanager,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // VPC（Public/Privateサブネット付き）
    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 0, // NAT Gatewayは金がかかるのと使わないので消す。
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // EC2 インスタンスに付ける IAM ロール（SSM接続用）
    const ec2Role = new iam.Role(this, "Ec2SsmRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
    });
    ec2Role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")
    );

    // セキュリティグループ（踏み台 EC2）
    const ec2Sg = new ec2.SecurityGroup(this, "Ec2Sg", {
      vpc,
      description: "Security group for bastion EC2",
      allowAllOutbound: true,
    });

    // セキュリティグループ（RDS）
    const rdsSg = new ec2.SecurityGroup(this, "RdsSg", {
      vpc,
      description: "Security group for RDS",
      allowAllOutbound: true,
    });

    // RDS へは EC2 からのみアクセス許可
    rdsSg.addIngressRule(ec2Sg, ec2.Port.tcp(5432), "Allow EC2 to access RDS");

    // 踏み台用 EC2 インスタンス（Amazon Linux 2）
    const ec2Instance = new ec2.Instance(this, "BastionHost", {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.NANO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux(),
      role: ec2Role,
      securityGroup: ec2Sg,
    });

    // secretmanagerのkey:rds/adminを取得
    const dbSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      "RdsCredentials",
      "rds/admin"
    );

    // RDS PostgreSQL（Private Subnet）
    const dbInstance = new rds.DatabaseInstance(this, "RdsInstance", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      credentials: rds.Credentials.fromSecret(dbSecret),
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      securityGroups: [rdsSg],
      deletionProtection: false,
      publiclyAccessible: false,
    });
  }
}
