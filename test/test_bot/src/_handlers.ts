import type { HandlersList } from "arcscord";
import { autocompleteCommand } from "./commands/autocomplete";
import { avatarCommand } from "./commands/avatar";
import { componentTestCommand } from "./commands/component_test";
import { disableComponentCommand } from "./commands/disable_component";
import { i18nCommand } from "./commands/i18n";
import { messageInfosCommand } from "./commands/message_infos";
import { testMiddlewareCommand } from "./commands/middleware";
import { subCommand } from "./commands/sub/def";
import { channelSelectMenu } from "./components/channel_select_menu";
import { deferEditButton } from "./components/function_test/defer_edit";
import { disableAllButton } from "./components/function_test/disable_all";
import { disableComponentButton } from "./components/function_test/disableComponent";
import { disableRowButton } from "./components/function_test/disableRow";
import { editButton } from "./components/function_test/edit";
import { mentionableSelectMenu } from "./components/mentionable_select_menu";
import { middleWareButton } from "./components/middleware";
import { feedbackModal, profileModal, surveyModal } from "./components/modal";
import { roleSelectMenu } from "./components/role_select_menu";
import { routeParamsButton } from "./components/route_params_button";
import { redSimpleButton, simpleButton } from "./components/simple_button";
import { stringSelectMenu } from "./components/string_select_menu";
import { typedSingleStringSelectMenu } from "./components/typed_single_string_select_menu";
import { typedStringSelectMenu } from "./components/typed_string_select_menu";
import { userSelectMenu } from "./components/user_select_menu";
import { messageEvent } from "./event/message";

export default {
  events: [messageEvent],
  components: [
    simpleButton,
    redSimpleButton,
    stringSelectMenu,
    typedStringSelectMenu,
    typedSingleStringSelectMenu,
    userSelectMenu,
    roleSelectMenu,
    mentionableSelectMenu,
    channelSelectMenu,
    profileModal,
    feedbackModal,
    surveyModal,
    disableAllButton,
    disableRowButton,
    disableComponentButton,
    editButton,
    deferEditButton,
    middleWareButton,
    routeParamsButton,
  ],
  commands: [
    avatarCommand,
    messageInfosCommand,
    componentTestCommand,
    autocompleteCommand,
    disableComponentCommand,
    testMiddlewareCommand,
    subCommand,
    i18nCommand,
  ],
} satisfies HandlersList;
