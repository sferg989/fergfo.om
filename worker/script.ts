import { PiercingGateway } from "@sferg989/fergfo-piercing-library";

export interface Env {
  APP_BASE_URL: string;
  ISOLATE_FRAGMENTS: boolean;
}

const gateway = new PiercingGateway<Env>({
  getLegacyAppBaseUrl(env) {
    return env.APP_BASE_URL;
  },
  isolateFragments(env) {
    return env.ISOLATE_FRAGMENTS || false;
  },
  shouldPiercingBeEnabled(request: Request) {
    
    return true;
  },
  async generateMessageBusState(requestMessageBusState, request) {
    

    return requestMessageBusState;
  },
});
gateway.registerFragment({
  fragmentId: "header",
  framework: "react",
  prePiercingStyles: `
    :not(piercing-fragment-outlet) > piercing-fragment-host {
      position: absolute;
      top: 10.45rem;
      left: 1rem;
      right: 1rem;
    }

    @media (max-width: 45rem) {
      :not(piercing-fragment-outlet) > piercing-fragment-host {
        top: 10.58rem;
      }
    }
    @media (max-width: 35rem) {
      :not(piercing-fragment-outlet) > piercing-fragment-host {
        top: 13.06rem;
      }
    }
    @media (max-width: 25rem) {
      :not(piercing-fragment-outlet) > piercing-fragment-host {
        top: 13.24rem;
      }
    }
    `,
  async shouldBeIncluded(request: Request) {
    return true;
  },
});
export default gateway;
