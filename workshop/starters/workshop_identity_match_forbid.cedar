// Required Lab 4: complete the unless block, then add this policy with the
// AgentCore CLI. Gateway generates the target-qualified action id. The resource
// must name your deployed Gateway: the lab guide substitutes
// ${PELLIER_GATEWAY_ARN} from your environment before the policy is added.
//
// Goal: a shopper may file a return only for the customer their token says
// they are. Cognito stamps `custom:customer_id` on the access token from the
// principal mapping, AgentCore Policy exposes that claim as a principal tag,
// and this rule compares the tag with the tool input. The `when` clause scopes
// the forbid to principals that carry a customer claim, so staff, who carry a
// scope claim instead, are governed by their own permit. For shoppers the rule
// is fail-closed: a missing customer_id or a mismatched customer is denied
// before the tool executes.
forbid(
  principal is AgentCore::OAuthUser,
  action == AgentCore::Action::"pellier-concierge-experience-target___initiate_return",
  resource == AgentCore::Gateway::"${PELLIER_GATEWAY_ARN}"
)
when {
  principal.hasTag("custom:customer_id")
}
unless {
  false
};
