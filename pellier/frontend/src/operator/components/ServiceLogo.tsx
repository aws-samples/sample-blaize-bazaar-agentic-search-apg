import { imageSrc } from '../../utils/assetPath'

export type ServiceName = 'aurora' | 'agentcore' | 'bedrock' | 'strands'

const LOGOS: Record<ServiceName, string> = {
  aurora: '/assets/icons/aws/amazon-aurora.svg',
  agentcore: '/assets/icons/aws/amazon-bedrock-agentcore.svg',
  bedrock: '/assets/icons/aws/amazon-bedrock.svg',
  strands: '/services/strands.png',
}

/** Authentic service artwork. The adjacent text supplies the accessible name. */
export default function ServiceLogo({ service, size = 24 }: {
  service: ServiceName
  size?: number
}) {
  return (
    <img
      className="operator-service-logo"
      src={imageSrc(LOGOS[service])}
      alt=""
      width={size}
      height={size}
    />
  )
}
