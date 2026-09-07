import { imageSrc } from '../../utils/assetPath'

export default function ServiceSource({ service, children }: {
  service: 'aurora' | 'agentcore'
  children: React.ReactNode
}) {
  const name = service === 'aurora' ? 'Amazon Aurora' : 'Amazon Bedrock AgentCore'
  const src = service === 'aurora' ? '/services/amazon-aurora.svg' : '/services/amazon-bedrock-agentcore.png'
  return <span className="operator-service-source"><img src={imageSrc(src)} alt="" width={28} height={28} /><span><strong>{name}</strong><span>{children}</span></span></span>
}
