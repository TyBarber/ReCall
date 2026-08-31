from __future__ import annotations

from typing import Any

from app.aws.sqs_models import NormalizationMessage


class SQSNormalizationPublisher:
    def __init__(self, client: Any, queue_url: str) -> None:
        self.client = client
        self.queue_url = queue_url

    def publish(self, message: NormalizationMessage) -> str:
        response = self.client.send_message(
            QueueUrl=self.queue_url,
            MessageBody=message.model_dump_json(),
        )
        return str(response["MessageId"])
