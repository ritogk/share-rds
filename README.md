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
