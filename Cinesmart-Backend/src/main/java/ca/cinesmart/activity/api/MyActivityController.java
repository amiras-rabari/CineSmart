package ca.cinesmart.activity.api;

import ca.cinesmart.activity.application.MyListsService;
import ca.cinesmart.activity.domain.RatedItem;
import ca.cinesmart.activity.domain.ReactionItem;
import ca.cinesmart.activity.domain.WatchedItem;
import ca.cinesmart.activity.domain.WatchlistItem;
import ca.cinesmart.shared.api.PageParams;
import ca.cinesmart.shared.api.PageResponse;
import ca.cinesmart.shared.security.CurrentUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** The logged-in user's lists (change.md Q15). GET /me itself (profile) is in identity's MeController. */
@RestController
@RequestMapping("/api/v1/me")
public class MyActivityController {

    private final MyListsService lists;

    public MyActivityController(MyListsService lists) {
        this.lists = lists;
    }

    @GetMapping("/watchlist")
    public PageResponse<WatchlistItem> watchlist(@AuthenticationPrincipal Jwt jwt,
                                                 @RequestParam(required = false) Integer page,
                                                 @RequestParam(required = false) Integer size) {
        return lists.watchlist(CurrentUser.id(jwt), PageParams.of(page, size));
    }

    @GetMapping("/watched")
    public List<WatchedItem> watched(@AuthenticationPrincipal Jwt jwt) {
        return lists.watched(CurrentUser.id(jwt));
    }

    @GetMapping("/ratings")
    public PageResponse<RatedItem> ratings(@AuthenticationPrincipal Jwt jwt,
                                           @RequestParam(required = false) Integer page,
                                           @RequestParam(required = false) Integer size) {
        return lists.ratings(CurrentUser.id(jwt), PageParams.of(page, size));
    }

    @GetMapping("/reactions")
    public List<ReactionItem> reactions(@AuthenticationPrincipal Jwt jwt) {
        return lists.reactions(CurrentUser.id(jwt));
    }
}
