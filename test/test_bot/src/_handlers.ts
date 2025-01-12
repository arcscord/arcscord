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
import { modal } from "./components/modal";
import { roleSelectMenu } from "./components/role_select_menu";
import { simpleButton } from "./components/simple_button";
import { stringSelectMenu } from "./components/string_select_menu";
import { userSelectMenu } from "./components/user_select_menu";
import { messageEvent } from "./event/message";
import { cronTask } from "./task/cron";
import { intervalTask } from "./task/interval";
import { multiCronTask } from "./task/multi_cron";

export default {
  events: [messageEvent],
  tasks: [cronTask, multiCronTask, intervalTask],
  components: [
    simpleButton,
    stringSelectMenu,
    userSelectMenu,
    roleSelectMenu,
    mentionableSelectMenu,
    channelSelectMenu,
    modal,
    disableAllButton,
    disableRowButton,
    disableComponentButton,
    editButton,
    deferEditButton,
    middleWareButton,
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
