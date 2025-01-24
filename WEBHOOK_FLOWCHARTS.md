# Webhook Flowcharts

Synchronization of records through this donation portal is primarily one
direction.

## Givebutter

## Stripe

### Email Webhook

The /api/webhook endpoint is only responsible for sending emails

```mermaid
flowchart TD

%% Nodes

  A("POST /api/webhook")
  B("stripeCheckoutSessionCompleted")
  C("stripeInvoicePaymentSucceeded")
  D("stripeInvoicePaymentFailed")

%% Edges

  A -- "type:
  checkout.session.completed" --> B -- "mode: payment" --> stripeCheckoutSessionCompletedPaymentEmail -- "fetchSessionPaymentIntent" --> sendEmail
  A -- "type:
  invoice.payment_succeeded" --> C --> stripeInvoicePaymentEmail
  A -- "type:
  invoice.payment_failed" --> D --> stripeInvoicePaymentEmail
  stripeInvoicePaymentEmail --> stripeInvoicePaymentEmailData -- "has email data?" --> sendEmail

```


## Eventbrite

### Slack Order Notifications

Notifications of Eventbrite orders are directly posted to Slack

```mermaid
flowchart TD

%% Nodes

  A("POST /api/eventbrite
  config.action: order.placed
  ")
  B("handleOrderPlaced")
  C("Eventbrite API")
  D("Slack API")

%% Edges
  A --> B
  B -- Lookup Order --> C
  C -- Post to #eventbrite --> D
```
