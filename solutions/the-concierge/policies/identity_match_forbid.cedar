// Required Lab 4 reference rule: a shopper may file a return only for the
// customer their token says they are. Cognito stamps `custom:customer_id` on
// the access token from the principal mapping, AgentCore Policy exposes that
// claim as a principal tag, and the rule compares the tag with the tool input.
// The `when` clause scopes the forbid to principals carrying a customer claim,
// so staff are governed by their own permit. The `unless` shape is fail-closed
// for shoppers: a missing customer_id or a mismatched customer is denied.
forbid(
  principal is AgentCore::OAuthUser,
  action == AgentCore::Action::"pellier-concierge-experience-target___initiate_return",
  resource == AgentCore::Gateway::"${PELLIER_GATEWAY_ARN}"
)
when {
  principal.hasTag("custom:customer_id")
}
unless {
  context.input has customer_id &&
  principal.getTag("custom:customer_id") == context.input.customer_id
};
