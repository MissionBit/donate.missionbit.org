# Webhook Flowcharts

Synchronization of records through this donation portal is primarily one
direction.

## Givebutter

## Stripe

### Email Webhook

The /api/webhook endpoint is only responsible for sending emails for donations
made through the legacy donate.missionbit.org portal

```mermaid
flowchart TD

%% Nodes

  A("POST /api/webhook")
  B("stripeCheckoutSessionCompleted")
  C("stripeInvoicePaymentSucceeded")
  D("stripeInvoicePaymentFailed")
  E[Sendgrid API]

%% Edges

  A -- "type:
  checkout.session.completed" --> B -- "mode: payment" --> stripeCheckoutSessionCompletedPaymentEmail -- "fetchSessionPaymentIntent
  Stripe API" --> sendEmail
  A -- "type:
  invoice.payment_succeeded" --> C --> stripeInvoicePaymentEmail
  A -- "type:
  invoice.payment_failed" --> D --> stripeInvoicePaymentEmail
  stripeInvoicePaymentEmail -- "Stripe API" --> stripeInvoicePaymentEmailData -- "has email data?" --> sendEmail
  sendEmail --> E
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
