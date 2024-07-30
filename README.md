# Serverless Patterns on CDK

ここにはサーバーレスパターンに基づいたデータ基盤構築のサンプルコードをいくつか掲載しています。

サーバーレスパターンについての詳細は、[AWSのページ](https://aws.amazon.com/jp/serverless/patterns/serverless-pattern/)をご参照ください。

## 各スタックの紹介

サーバーレスパターンを使ったサンプルコードをスタック毎に実装しています。
スタック毎にAWSにデプロイしていただけると、その内容がAWSに反映されます。

```bash
cdk deploy <スタック名>
```

- SimpleS3DataProcessingStack
    - S3にあるデータファイルに対する、シンプルなデータ加工
- EventDrivenCollaborationStack
    - イベント駆動の連携処理
- StateMachineChainStack
    - ステートマシンでの制御、および、ステートマシン間連携処理
