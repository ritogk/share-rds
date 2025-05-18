# setup

## 事前準備

aws マネジメントコンソールの SecretManager で db 認証情報を作成する

```
key: rds/admin
username: \***\*
password: \*\***
```

## deploy

```
npx cdk deploy --all
```

## db クライアントツールから RDS に接続

```bash
# aws sso
export AWS_PROFILE=all-readonly-788594208758
aws sso login
# port-forwarding
aws ssm start-session \
  --target i-07acc69599e46bb65 \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{
    "host": ["infrastack-rdsinstance1d827d17-jw66natt5bt6.ce96g15npuas.ap-northeast-1.rds.amazonaws.com"],
    "portNumber": ["5432"],
    "localPortNumber": ["15432"]
  }'
```

### db クライアントツールの設定

```
host: localhost
user: *****
password: *****
database: *****
port: 15432
```
